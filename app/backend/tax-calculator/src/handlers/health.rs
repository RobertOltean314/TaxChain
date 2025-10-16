use axum::response::Json as ResponseJson;

/// Health check endpoint
pub async fn health() -> ResponseJson<serde_json::Value> {
    ResponseJson(serde_json::json!({
        "status": "healthy",
        "service": "tax-calculator",
        "version": "0.1.0",
        "framework": "axum"
    }))
}