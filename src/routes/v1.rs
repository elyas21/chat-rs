use axum::Router;
use axum::routing::{get, post};

use crate::handlers::v1::{create_user, get_user_by_id_handler, get_users_handler};

pub fn router() -> Router {
    Router::new()
        .route("/users", post(create_user))
        .route("/users", get(get_users_handler))
        .route("/user/{id}", get(get_user_by_id_handler))
}
