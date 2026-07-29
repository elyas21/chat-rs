mod auth;
mod db;
mod handlers;
mod models;
mod routes;

use mongodb::Database;
use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;

/// Shared application state injected into every request handler.
#[derive(Clone)]
pub struct AppState {
    pub db: Database,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let uri = std::env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let db_name = std::env::var("MONGODB_DB").unwrap_or_else(|_| "rs_chat".to_string());

    // Build client — no blocking ping on startup; driver connects lazily on first request
    let db = db::build_client(&uri, &db_name).await?;

    let state = AppState { db };
    let app = routes::app_router(state).layer(
        ServiceBuilder::new()
            .layer(TraceLayer::new_for_http())
            .into_inner(),
    );

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    println!("Server started on http://0.0.0.0:3000 (connecting to MongoDB on first request)");
    axum::serve(listener, app).await?;
    Ok(())
}
