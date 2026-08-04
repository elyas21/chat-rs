use rs_chat::AppState;
use rs_chat::routes;
use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    // Initialize structured tracing subscriber so server logs appear on Render/stdout
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "rs_chat=info,tower_http=info".into()),
        )
        .init();

    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
    tracing::info!("Initializing rs-chat Axum server with auto-reconnecting Redis at {}...", redis_url);

    let state = AppState::new(&redis_url).await?;

    let app = routes::app_router(state).layer(
        ServiceBuilder::new()
            .layer(TraceLayer::new_for_http())
            .into_inner(),
    );

    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("✓ Axum Server started successfully on {} (Listening for API requests)", addr);
    axum::serve(listener, app).await?;
    Ok(())
}

