use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;

use crate::AppState;
use crate::db::{
    add_chat_session, add_message, add_user, get_chat_sessions, get_messages_by_session,
    get_user_by_id, get_users,
};
use crate::models::chat_session::ChatSession;
use crate::models::message::Message;
use crate::models::user::User;

pub async fn health_check_handler(State(state): State<AppState>) -> impl IntoResponse {
    let mut con = state.conn_manager.clone();
    let is_redis_ok = tokio::time::timeout(
        std::time::Duration::from_secs(2),
        redis::cmd("PING").query_async::<String>(&mut con),
    )
    .await
    .map(|res| res.is_ok())
    .unwrap_or(false);

    if is_redis_ok {
        (
            StatusCode::OK,
            Json(serde_json::json!({
                "status": "ok",
                "redis": true
            })),
        )
            .into_response()
    } else {
        tracing::warn!("Health check failed: Redis ping failed or timed out");
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({
                "status": "unhealthy",
                "redis": false
            })),
        )
            .into_response()
    }
}

// ── User payloads ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateUserPayload {
    pub name: String,
    pub email: String,
}

pub async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserPayload>,
) -> impl IntoResponse {
    let user = User::new(payload.name, payload.email);
    match add_user(&state.conn_manager, user).await {
        Ok(created) => (StatusCode::CREATED, Json(created)).into_response(),
        Err(e) => {
            tracing::error!("create_user handler error: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response()
        }
    }
}

pub async fn get_users_handler(State(state): State<AppState>) -> impl IntoResponse {
    match get_users(&state.conn_manager).await {
        Ok(users) => (StatusCode::OK, Json(users)).into_response(),
        Err(e) => {
            tracing::error!("get_users_handler error: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response()
        }
    }
}

pub async fn get_user_by_id_handler(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match get_user_by_id(&state.conn_manager, &id).await {
        Ok(user) => (StatusCode::OK, Json(user)).into_response(),
        Err(e) => {
            tracing::error!("get_user_by_id_handler error for id '{}': {:?}", id, e);
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response()
        }
    }
}

// ── Session payloads ─────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateSessionPayload {
    pub room_name: String,
    pub participants: Vec<String>,
}

pub async fn create_session_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateSessionPayload>,
) -> impl IntoResponse {
    let session = ChatSession::new(payload.room_name, payload.participants);
    match add_chat_session(&state.conn_manager, session).await {
        Ok(created) => (StatusCode::CREATED, Json(created)).into_response(),
        Err(e) => {
            tracing::error!("create_session_handler error: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response()
        }
    }
}

pub async fn get_sessions_handler(State(state): State<AppState>) -> impl IntoResponse {
    match get_chat_sessions(&state.conn_manager).await {
        Ok(sessions) => (StatusCode::OK, Json(sessions)).into_response(),
        Err(e) => {
            tracing::error!("get_sessions_handler error: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response()
        }
    }
}

// ── Message payloads ─────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateMessagePayload {
    pub sender_id: String,
    pub content: String,
}

pub async fn send_message_handler(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(payload): Json<CreateMessagePayload>,
) -> impl IntoResponse {
    let timestamp = chrono::Utc::now().timestamp();
    let message = Message::new(session_id, payload.sender_id, payload.content, timestamp);
    match add_message(&state.conn_manager, message).await {
        Ok(created) => (StatusCode::CREATED, Json(created)).into_response(),
        Err(e) => {
            tracing::error!("send_message_handler error: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response()
        }
    }
}

pub async fn get_messages_handler(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    match get_messages_by_session(&state.conn_manager, &session_id).await {
        Ok(messages) => (StatusCode::OK, Json(messages)).into_response(),
        Err(e) => {
            tracing::error!("get_messages_handler error for session '{}': {:?}", session_id, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response()
        }
    }
}

