mod handlers;
mod services;

use axum::{
    routing::{get, post, put, delete},
    Router,
};
use tower_http::cors::CorsLayer;
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    tracing::info!("Starting Business Entity Service...");

    let app = Router::new()
        .route("/health", get(handlers::health))
        
        // Business entity CRUD endpoints
        .route("/api/v1/entities", post(handlers::create_entity))
        .route("/api/v1/entities/:id", get(handlers::get_entity))
        .route("/api/v1/entities/:id", put(handlers::update_entity))
        .route("/api/v1/entities/:id", delete(handlers::delete_entity))
        .route("/api/v1/entities", get(handlers::list_entities))
        
        // Validation endpoints
        .route("/api/v1/entities/:id/validate", post(handlers::validate_entity))
        .route("/api/v1/validate", post(handlers::validate_entity_data))
        
        // CORS
        .layer(CorsLayer::permissive());

    let bind_address = "0.0.0.0:8003";
    tracing::info!("Business Entity Service listening on: {}", bind_address);

    let listener = tokio::net::TcpListener::bind(bind_address)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app)
        .await
        .expect("Failed to start server");

    Ok(())
}
