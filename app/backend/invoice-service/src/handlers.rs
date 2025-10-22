use crate::dto::{CreateInvoiceRequest, InvoiceResponse};
use crate::services::InvoiceService;
use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::Json as ResponseJson,
};
use common_types::{ApiResponse, ErrorResponse};
use sqlx::PgPool;
use uuid::Uuid;

// CRUD OPERATIONS for invoices

/// Health check endpoint
pub async fn health() -> ResponseJson<serde_json::Value> {
    ResponseJson(serde_json::json!({
        "status": "healthy",
        "service": "invoice-service",
        "version": "0.1.0",
        "port": 8001
    }))
}

/// Create a new invoice
pub async fn create_invoice(
    State(pool): State<PgPool>,
    Json(request): Json<CreateInvoiceRequest>,
) -> Result<ResponseJson<ApiResponse<InvoiceResponse>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Creating invoice: {:?}", request.numar_serie);

    let service = InvoiceService::new(pool);

    match service.create_invoice(request).await {
        Ok(invoice) => Ok(ResponseJson(ApiResponse::success(invoice))),
        Err(e) => {
            tracing::error!("Failed to create invoice: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}

/// Get invoice by ID
pub async fn get_invoice(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<ResponseJson<ApiResponse<InvoiceResponse>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Fetching invoice: {}", id);

    let service = InvoiceService::new(pool);

    match service.get_invoice(id).await {
        Ok(invoice) => Ok(ResponseJson(ApiResponse::success(invoice))),
        Err(e) => {
            tracing::error!("Failed to get invoice: {}", e);
            Err((
                StatusCode::NOT_FOUND,
                ResponseJson(ErrorResponse::new(e.to_string()).with_code("INVOICE_NOT_FOUND")),
            ))
        }
    }
}

/// Update invoice
pub async fn update_invoice(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(request): Json<CreateInvoiceRequest>,
) -> Result<ResponseJson<ApiResponse<InvoiceResponse>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Updating invoice: {}", id);

    let service = InvoiceService::new(pool);

    match service.update_invoice(id, request).await {
        Ok(invoice) => Ok(ResponseJson(ApiResponse::success(invoice))),
        Err(e) => {
            tracing::error!("Failed to update invoice: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}

/// Delete invoice
pub async fn delete_invoice(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<ResponseJson<ApiResponse<String>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Deleting invoice: {}", id);

    let service = InvoiceService::new(pool);

    match service.delete_invoice(id).await {
        Ok(_) => Ok(ResponseJson(ApiResponse::success(format!(
            "Invoice {} deleted",
            id
        )))),
        Err(e) => {
            tracing::error!("Failed to delete invoice: {}", e);
            Err((
                StatusCode::NOT_FOUND,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}

/// List all invoices
pub async fn list_invoices(
    State(pool): State<PgPool>,
) -> Result<
    ResponseJson<ApiResponse<Vec<InvoiceResponse>>>,
    (StatusCode, ResponseJson<ErrorResponse>),
> {
    tracing::info!("Listing invoices");

    let service = InvoiceService::new(pool);

    match service.list_invoices().await {
        Ok(invoices) => Ok(ResponseJson(ApiResponse::success(invoices))),
        Err(e) => {
            tracing::error!("Failed to list invoices: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}

/// Validate invoice
pub async fn validate_invoice(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<ResponseJson<ApiResponse<serde_json::Value>>, (StatusCode, ResponseJson<ErrorResponse>)>
{
    tracing::info!("Validating invoice: {}", id);

    let service = InvoiceService::new(pool);

    match service.validate_invoice(id).await {
        Ok(result) => Ok(ResponseJson(ApiResponse::success(result))),
        Err(e) => {
            tracing::error!("Failed to validate invoice: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}
