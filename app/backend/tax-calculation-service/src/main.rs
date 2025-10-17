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

    tracing::info!("Starting Tax Calculation Service...");

    let app = Router::new()
        .route("/health", get(handlers::health))
        
        // Tax calculation endpoints
        .route("/api/v1/calculate", post(handlers::calculate_tax))
        .route("/api/v1/rates", get(handlers::get_tax_rates))
        .route("/api/v1/rates/:country_code", get(handlers::get_tax_rates_by_country))
        
        // CORS
        .layer(CorsLayer::permissive());

    let bind_address = "0.0.0.0:8002";
    tracing::info!("Tax Calculation Service listening on: {}", bind_address);

    let listener = tokio::net::TcpListener::bind(bind_address)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app)
        .await
        .expect("Failed to start server");

    Ok(())
}
