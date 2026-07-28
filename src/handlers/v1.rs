use axum::{extract::Json, http::StatusCode, response::IntoResponse};
use serde::Deserialize;

use crate::db::{add_user, get_user_by_id, get_users};
use crate::models::user::User;
use axum::extract::Path;

#[derive(Debug, Deserialize)]
pub struct CreateUserPayload {
    pub name: String,
    pub email: String,
}

pub async fn create_user(Json(payload): Json<CreateUserPayload>) -> impl IntoResponse {
    let user = User::new(payload.name, payload.email);
    match add_user(user.clone()) {
        Ok(_) => (StatusCode::CREATED, Json(user)).into_response(),
        Err(e) => {
            eprint!("Faild to save user: {e}");
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn get_users_handler() -> impl IntoResponse {
    let users = get_users();
    (StatusCode::OK, Json(users)).into_response()
}

pub async fn get_user_by_id_handler(Path(id): Path<String>) -> impl IntoResponse {
    let user = get_user_by_id(&id);

    match user {
        Ok(user) => (StatusCode::CREATED, Json(user)).into_response(),
        Err(e) => {
            eprint!("Faild to get user: {e}");
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}
