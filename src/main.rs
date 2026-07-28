mod db;
mod handlers;
mod models;
mod routes;
use axum::{Router, routing::get};

use axum::serve;
use tokio::net::TcpListener;
use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;

#[tokio::main]
async fn main() {
    // let app: Router = Router::new().route("/", get(|| async { "hello ,world!" }));
    let app = routes::app_router().layer(
        ServiceBuilder::new()
            .layer(TraceLayer::new_for_http())
            .into_inner(),
    );

    let listner = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("The Server has started ");
    axum::serve(listner, app).await.unwrap();
}
