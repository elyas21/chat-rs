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
        let client = redis::Client::open(redis_url)?;

        tracing::info!("Establishing ConnectionManager for Redis endpoint: {}", redis_url);

        let conn_manager = match tokio::time::timeout(
            std::time::Duration::from_secs(15),
            ConnectionManager::new(client.clone()),
        )
        .await
        {
            Ok(Ok(mgr)) => mgr,
            Ok(Err(e)) => {
                tracing::error!("Failed to connect to Redis endpoint ({}): {}", redis_url, e);
                return Err(Box::new(e));
            }
            Err(_) => {
                tracing::error!("Timeout connecting to Redis endpoint ({})", redis_url);
                return Err(anyhow::anyhow!("Timeout connecting to Redis endpoint ({})", redis_url).into());
            }
        };

        Ok(Self { client, conn_manager })
    }
}

