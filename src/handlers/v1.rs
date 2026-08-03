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
    let is_redis_ok = crate::db::get_con(&state.client).await.is_ok();
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "ok",
            "redis": is_redis_ok
        })),
    )
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
    match add_user(&state.client, user).await {
        Ok(created) => (StatusCode::CREATED, Json(created)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

pub async fn get_users_handler(State(state): State<AppState>) -> impl IntoResponse {
    match get_users(&state.client).await {
        Ok(users) => (StatusCode::OK, Json(users)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

pub async fn get_user_by_id_handler(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match get_user_by_id(&state.client, &id).await {
        Ok(user) => (StatusCode::OK, Json(user)).into_response(),
        Err(e) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
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
    match add_chat_session(&state.client, session).await {
        Ok(created) => (StatusCode::CREATED, Json(created)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

pub async fn get_sessions_handler(State(state): State<AppState>) -> impl IntoResponse {
    match get_chat_sessions(&state.client).await {
        Ok(sessions) => (StatusCode::OK, Json(sessions)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
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
    match add_message(&state.client, message).await {
        Ok(created) => (StatusCode::CREATED, Json(created)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

pub async fn get_messages_handler(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    match get_messages_by_session(&state.client, &session_id).await {
        Ok(messages) => (StatusCode::OK, Json(messages)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}
