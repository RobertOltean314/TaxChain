mod dto;
mod handlers;
mod models;
mod services;

use axum::{
    routing::{delete, get, post, put},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::env;
use tower_http::cors::CorsLayer;
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    tracing::info!("Starting Invoice Service...");

    // Get database URL from environment
    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgresql://tax_user:tax_password@localhost:5432/tax_calculator".to_string()
    });

    tracing::info!("Connecting to database...");

    // Create database connection pool
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    tracing::info!("Database connection established");

    let app = Router::new()
        // Health check
        .route("/health", get(handlers::health))
        // Invoice endpoints + CRUD operations + Validation
        .route("/api/v1/invoices", post(handlers::create_invoice))
        .route("/api/v1/invoices/:id", get(handlers::get_invoice))
        .route("/api/v1/invoices/:id", put(handlers::update_invoice))
        .route("/api/v1/invoices/:id", delete(handlers::delete_invoice))
        .route("/api/v1/invoices", get(handlers::list_invoices))
        .route(
            "/api/v1/invoices/:id/validate",
            post(handlers::validate_invoice),
        )
        // Add database pool as shared state
        .with_state(pool)
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
