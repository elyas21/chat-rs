use redis::aio::ConnectionManager;

pub mod auth;
pub mod db;
pub mod handlers;
pub mod models;
pub mod routes;

/// Shared application state injected into every request handler.
#[derive(Clone)]
pub struct AppState {
    pub client: redis::Client,
    pub conn_manager: ConnectionManager,
}

impl AppState {
    /// Create a new AppState with an auto-reconnecting Redis ConnectionManager
    pub async fn new(redis_url: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let client = match redis::Client::open(redis_url) {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("Failed to open Redis client for {}: {}. Falling back to localhost.", redis_url, e);
                redis::Client::open("redis://127.0.0.1:6379")?
            }
        };

        let conn_manager = match tokio::time::timeout(
            std::time::Duration::from_secs(2),
            ConnectionManager::new(client.clone()),
        )
        .await
        {
            Ok(Ok(mgr)) => mgr,
            Ok(Err(e)) => {
                tracing::warn!("Failed to connect to primary Redis endpoint ({}): {}. Trying local fallback.", redis_url, e);
                let fallback_client = redis::Client::open("redis://127.0.0.1:6379")?;
                ConnectionManager::new(fallback_client.clone()).await?
            }
            Err(_) => {
                tracing::warn!("Timeout connecting to primary Redis endpoint ({}). Trying local fallback.", redis_url);
                let fallback_client = redis::Client::open("redis://127.0.0.1:6379")?;
                ConnectionManager::new(fallback_client.clone()).await?
            }
        };

        Ok(Self { client, conn_manager })
    }
}

