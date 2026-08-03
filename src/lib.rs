pub mod auth;
pub mod db;
pub mod handlers;
pub mod models;
pub mod routes;

/// Shared application state injected into every request handler.
#[derive(Clone)]
pub struct AppState {
    pub client: redis::Client,
}
