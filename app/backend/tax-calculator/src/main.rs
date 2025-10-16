mod config;
mod dto;
mod handlers;
mod models;
mod services;
mod utils;

use crate::config::AppConfig;
use crate::handlers::{calculate_tax, health};
use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = AppConfig::from_env().unwrap_or_default();

    println!("Starting Tax Calculator Server...");
    println!("Config: {:?}", config);

    let app = Router::new()
        .route("/health", get(health))
        .route("/calculate-tax", post(calculate_tax))
        .layer(CorsLayer::permissive());

    let bind_address = config.bind_address();
    println!("Server listening on: {}", bind_address);

    let listener = tokio::net::TcpListener::bind(&bind_address)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app)
        .await
        .expect("Failed to start server");

    Ok(())
}
