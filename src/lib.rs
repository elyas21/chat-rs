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
        let mut info: redis::ConnectionInfo = redis::IntoConnectionInfo::into_connection_info(redis_url)?;
        info.redis.protocol = redis::ProtocolVersion::RESP2;
        let client = redis::Client::open(info)?;

        tracing::info!("Establishing ConnectionManager for Redis endpoint: {}", redis_url);

        let max_retries = 3;
        let mut attempt = 0;
        let conn_manager = loop {
            attempt += 1;
            match tokio::time::timeout(
                std::time::Duration::from_secs(15),
                ConnectionManager::new(client.clone()),
            )
            .await
            {
                Ok(Ok(mgr)) => break mgr,
                Ok(Err(e)) => {
                    tracing::warn!("Attempt {}/{}: Failed to connect to Redis endpoint: {}", attempt, max_retries, e);
                }
                Err(_) => {
                    tracing::warn!("Attempt {}/{}: Timeout connecting to Redis endpoint ({})", attempt, max_retries, redis_url);
                }
            }

            if attempt >= max_retries {
                tracing::error!(
                    "Failed to connect to Redis after {} attempts. Check REDIS_URL credentials and network reachability. (Note: Special characters like '$', ';', '|', '%' in password must be URL-encoded).",
                    max_retries
                );
                return Err(anyhow::anyhow!(
                    "Failed to connect to Redis endpoint ({}) after {} attempts",
                    redis_url,
                    max_retries
                )
                .into());
            }

            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        };

        Ok(Self { client, conn_manager })
    }
}

