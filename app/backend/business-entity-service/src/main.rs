mod handlers;
mod services;

use axum::{
    routing::{delete, get, post, put},
    Router,
};
use dotenvy::dotenv;
use std::env;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    dotenv().ok();
    tracing::info!("Starting Business Entity Service...");

    let app = Router::new()
        .route("/health", get(handlers::health))
        .route("/api/entities", post(handlers::create_entity))
        .route("/api/entities/:id", get(handlers::get_entity))
        .route("/api/entities/:id", put(handlers::update_entity))
        .route("/api/entities/:id", delete(handlers::delete_entity))
        .route("/api/entities", get(handlers::list_entities))
        .route(
            "/api/entities/:id/validate",
            post(handlers::validate_entity),
        )
        .route("/api/validate", post(handlers::validate_entity_data))
        .layer(CorsLayer::permissive());

    let bind_address = env::var("BUSINESS_ENTITY_SERVICE_ADDRESS")?;
    let socket_address: SocketAddr = bind_address.parse()?;
    tracing::info!("Business Entity Service listening on: {}", socket_address);

    let listener = tokio::net::TcpListener::bind(socket_address)
        .await
        .map_err(|e| format!("Failed to bind to address {}: {}", socket_address, e))?;

    axum::serve(listener, app)
        .await
        .expect("Failed to start server");

    Ok(())
}
