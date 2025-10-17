mod handlers;
mod services;
mod models;
mod dto;

use axum::{
    routing::{get, post, put, delete},
    Router,
};
use tower_http::cors::CorsLayer;
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    tracing::info!("Starting Invoice Service...");

    let app = Router::new()
        // Health check
        .route("/health", get(handlers::health))
        
        // Invoice endpoints + CRUD operations + Validation
        .route("/api/v1/invoices", post(handlers::create_invoice))
        .route("/api/v1/invoices/:id", get(handlers::get_invoice))
        .route("/api/v1/invoices/:id", put(handlers::update_invoice))
        .route("/api/v1/invoices/:id", delete(handlers::delete_invoice))
        .route("/api/v1/invoices", get(handlers::list_invoices))
        .route("/api/v1/invoices/:id/validate", post(handlers::validate_invoice))
        
        // CORS
        .layer(CorsLayer::permissive());

    let bind_address = "0.0.0.0:8001";
    tracing::info!("Invoice Service listening on: {}", bind_address);

    let listener = tokio::net::TcpListener::bind(bind_address)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app)
        .await
        .expect("Failed to start server");

    Ok(())
}
