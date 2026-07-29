use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;

use crate::AppState;
use crate::db::{add_chat_session, add_user, get_user_by_id, get_users};
use crate::models::user::User;

#[derive(Debug, Deserialize)]
pub struct CreateUserPayload {
    pub name: String,
    pub email: String,
}

pub async fn create_chat_session(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserPayload>,
) -> impl IntoResponse {
    let user = User::new(payload.name, payload.email);
    match add_user(&state.db, user).await {
        Ok(created) => (StatusCode::CREATED, Json(created)).into_response(),
        Err(e) => {
            eprintln!("Failed to save user: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response()
        }
    }
}

pub async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserPayload>,
) -> impl IntoResponse {
    let user = User::new(payload.name, payload.email);
    match add_user(&state.db, user).await {
        Ok(created) => (StatusCode::CREATED, Json(created)).into_response(),
        Err(e) => {
            eprintln!("Failed to save user: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response()
        }
    }
}

pub async fn get_users_handler(State(state): State<AppState>) -> impl IntoResponse {
    match get_users(&state.db).await {
        Ok(users) => (StatusCode::OK, Json(users)).into_response(),
        Err(e) => {
            eprintln!("Failed to get users: {e}");
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
    match get_user_by_id(&state.db, &id).await {
        Ok(user) => (StatusCode::OK, Json(user)).into_response(),
        Err(e) => {
            eprintln!("Failed to get user: {e}");
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response()
        }
    }
}
