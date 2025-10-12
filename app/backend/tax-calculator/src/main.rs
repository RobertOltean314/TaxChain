use axum::{
    extract::Json,
    http::StatusCode,
    response::Json as ResponseJson,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::CorsLayer;

#[derive(Debug, Deserialize)]
struct InvoiceData {
    pub invoices: Vec<Invoice>,
}

#[derive(Debug, Deserialize)]
struct Invoice {
    pub amount: f64,
    pub invoice_type: InvoiceType, // Income or Expense
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
enum InvoiceType {
    Income,
    Expense,
}

#[derive(Debug, Serialize)]
struct TaxCalculationResponse {
    pub total_income: f64,
    pub total_expenses: f64,
    pub profit: f64,
    pub tax_owed: f64,
    pub tax_rate: f64,
    pub zk_proof_generated: bool, // Will be true when we implement ZK proofs
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    pub error: String,
}

/// Calculate tax based on uploaded invoice data
async fn calculate_tax(
    Json(invoice_data): Json<InvoiceData>,
) -> Result<ResponseJson<TaxCalculationResponse>, (StatusCode, ResponseJson<ErrorResponse>)> {
    println!("Received invoice data: {:?}", invoice_data);

    // Step 1: Process invoices and calculate totals
    let mut total_income = 0.0;
    let mut total_expenses = 0.0;

    for invoice in &invoice_data.invoices {
        match invoice.invoice_type {
            InvoiceType::Income => total_income += invoice.amount,
            InvoiceType::Expense => total_expenses += invoice.amount,
        }
    }

    // Step 2: Calculate profit and tax
    let profit = total_income - total_expenses;
    
    // Ensure no negative profit (business rule)
    if profit < 0.0 {
        return Err((
            StatusCode::BAD_REQUEST,
            ResponseJson(ErrorResponse {
                error: "Negative profit not allowed. Expenses cannot exceed income.".to_string(),
            }),
        ));
    }

    // Calculate 10% flat tax on profit
    let tax_rate = 0.10;
    let tax_owed = profit * tax_rate;

    // Step 3: Generate ZK proof (placeholder for now)
    let zk_proof_generated = generate_zk_proof(total_income, total_expenses, tax_owed).await;

    // Step 4: Return response
    let response = TaxCalculationResponse {
        total_income,
        total_expenses,
        profit,
        tax_owed,
        tax_rate,
        zk_proof_generated,
    };

    Ok(ResponseJson(response))
}

/// Placeholder for ZK proof generation
/// TODO: Implement actual ZK proof generation using Circom circuit
async fn generate_zk_proof(_income: f64, _expenses: f64, _tax_owed: f64) -> bool {
    println!("Generating ZK proof...");
    
    // Simulate proof generation time
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    
    // For now, always return true (proof generated successfully)
    // Later, this will call our Circom circuit and return actual proof
    true
}

/// Health check endpoint
async fn health() -> ResponseJson<serde_json::Value> {
    ResponseJson(serde_json::json!({
        "status": "healthy",
        "service": "tax-calculator",
        "version": "0.1.0",
        "framework": "axum"
    }))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Starting Tax Calculator Service (Axum) on port 8081");

    // Create router with routes
    let app = Router::new()
        .route("/health", get(health))
        .route("/calculate-tax", post(calculate_tax))
        .layer(CorsLayer::permissive()); // Enable CORS for frontend integration

    // Create listener
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8081")
        .await
        .expect("Failed to bind to address");

    println!("Tax Calculator Service running on http://0.0.0.0:8081");

    // Start server
    axum::serve(listener, app)
        .await
        .expect("Failed to start server");

    Ok(())
}