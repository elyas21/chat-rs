use axum::Router;
use crate::AppState;
use tower_http::cors::CorsLayer;

pub mod v1;

pub fn app_router(state: AppState) -> Router {
    Router::new()
        .nest("/v1", v1::router(state))
        .layer(CorsLayer::permissive())
}
