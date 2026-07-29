use axum::Router;
use crate::AppState;

pub mod v1;

pub fn app_router(state: AppState) -> Router {
    Router::new().nest("/v1", v1::router(state))
}
