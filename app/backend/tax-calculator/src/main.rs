mod models;
mod handlers;
mod services;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::CorsLayer;
use crate::handlers::{calculate_tax, health};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let app = Router::new()
        .route("/health", get(health))
        .route("/calculate-tax", post(calculate_tax))
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8081")
        .await
        .expect("Failed to bind to address");


    axum::serve(listener, app)
        .await
        .expect("Failed to start server");

    Ok(())
}