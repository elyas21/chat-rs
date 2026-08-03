use axum::Router;
use axum::routing::{get, post};

use crate::auth::{authorize, protected};
use crate::handlers::v1::{
    create_user, get_user_by_id_handler, get_users_handler,
    create_session_handler, get_sessions_handler,
    send_message_handler, get_messages_handler,
};
use crate::AppState;

pub fn router(state: AppState) -> Router {
    Router::new()
        // users
        .route("/users", post(create_user))
        .route("/users", get(get_users_handler))
        .route("/users/{id}", get(get_user_by_id_handler))
        // sessions
        .route("/sessions", post(create_session_handler))
        .route("/sessions", get(get_sessions_handler))
        // messages
        .route("/sessions/{id}/messages", post(send_message_handler))
        .route("/sessions/{id}/messages", get(get_messages_handler))
        // auth
        .route("/protected", get(protected))
        .route("/authorize", post(authorize))
        .with_state(state)
}
