mod handlers;
mod services;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::CorsLayer;
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    tracing::info!("Starting ZK Proof Service...");

    let app = Router::new()
        .route("/health", get(handlers::health))
        // ZK proof endpoints
        .route("/api/v1/generate", post(handlers::generate_proof))
        .route("/api/v1/verify", post(handlers::verify_proof))
        .route("/api/v1/proof/:calculation_id", get(handlers::get_proof))
        // CORS
        .layer(CorsLayer::permissive());

    let bind_address = "0.0.0.0:8004";
    tracing::info!("ZK Proof Service listening on: {}", bind_address);

    let listener = tokio::net::TcpListener::bind(bind_address)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app)
        .await
        .expect("Failed to start server");

    Ok(())
}
