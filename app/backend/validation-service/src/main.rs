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

    tracing::info!("Starting Validation Service...");

    let app = Router::new()
        .route("/health", get(handlers::health))
        
        // Validation endpoints
        .route("/api/v1/validate/invoice", post(handlers::validate_invoice))
        .route("/api/v1/validate/business-entity", post(handlers::validate_business_entity))
        .route("/api/v1/validate/tax-calculation", post(handlers::validate_tax_calculation))
        .route("/api/v1/validate/comprehensive", post(handlers::comprehensive_validation))
        
        // CORS
        .layer(CorsLayer::permissive());

    let bind_address = "0.0.0.0:8005";
    tracing::info!("Validation Service listening on: {}", bind_address);

    let listener = tokio::net::TcpListener::bind(bind_address)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app)
        .await
        .expect("Failed to start server");

    Ok(())
}
