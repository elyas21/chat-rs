use rs_chat::AppState;
use rs_chat::routes;
use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
    println!("Initializing rs-chat Axum server for Redis Cloud at {}...", redis_url);

    let client = redis::Client::open(redis_url)?;
    let state = AppState { client };

    let app = routes::app_router(state).layer(
        ServiceBuilder::new()
            .layer(TraceLayer::new_for_http())
            .into_inner(),
    );

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await?;
    println!("✓ Axum Server started successfully on http://127.0.0.1:3000 (Listening for API requests)");
    axum::serve(listener, app).await?;
    Ok(())
}
