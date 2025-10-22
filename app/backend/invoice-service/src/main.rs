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
    tracing_subscriber::fmt::init();
    tracing::info!("Starting Invoice Service...");

    let database_url = env::var("DATABASE_URL")?;
    tracing::info!("Connecting to database...");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");
    tracing::info!("Database connection established");

    let app = Router::new()
        .route("/health", get(handlers::health))
        .route("/api/invoices", post(handlers::create_invoice))
        .route("/api/invoices/:id", get(handlers::get_invoice))
        .route("/api/invoices/:id", put(handlers::update_invoice))
        .route("/api/invoices/:id", delete(handlers::delete_invoice))
        .route("/api/invoices", get(handlers::list_invoices))
        .route(
            "/api/invoices/:id/validate",
            post(handlers::validate_invoice),
        )
        .with_state(pool)
        .layer(CorsLayer::permissive());

    let bind_address = env::var("INVOICE_SERVICE_ADDRESS")?;
    tracing::info!("Invoice Service listening on: {}", bind_address);

    let listener = tokio::net::TcpListener::bind(bind_address)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app)
        .await
        .expect("Failed to start server");

    Ok(())
}
