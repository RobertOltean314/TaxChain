use axum::{
    extract::Json,
    http::StatusCode,
    response::Json as ResponseJson,
};
use common_types::{
    CreateInvoiceRequest, BusinessEntityValidationRequest, TaxCalculationRequest,
    ApiResponse, ErrorResponse,
};
use crate::services::ValidationService;
use serde::{Deserialize, Serialize};

// TODO: Check to see if those can be moved in a separate file
#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationResponse {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub validation_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ComprehensiveValidationRequest {
    pub invoice: Option<CreateInvoiceRequest>,
    pub business_entity: Option<BusinessEntityValidationRequest>,
    pub tax_calculation: Option<TaxCalculationRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ComprehensiveValidationResponse {
    pub overall_valid: bool,
    pub invoice_validation: Option<ValidationResponse>,
    pub business_entity_validation: Option<ValidationResponse>,
    pub tax_calculation_validation: Option<ValidationResponse>,
    pub cross_validation_errors: Vec<String>,
}

pub async fn health() -> ResponseJson<serde_json::Value> {
    ResponseJson(serde_json::json!({
        "status": "healthy",
        "service": "validation-service",
        "version": "0.1.0",
        "port": 8005
    }))
}

pub async fn validate_invoice(
    Json(request): Json<CreateInvoiceRequest>,
) -> Result<ResponseJson<ApiResponse<ValidationResponse>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Validating invoice: {}", request.numar_serie);
    
    let service = ValidationService::new();
    
    match service.validate_invoice(request).await {
        Ok(response) => Ok(ResponseJson(ApiResponse::success(response))),
        Err(e) => {
            tracing::error!("Failed to validate invoice: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}

pub async fn validate_business_entity(
    Json(request): Json<BusinessEntityValidationRequest>,
) -> Result<ResponseJson<ApiResponse<ValidationResponse>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Validating business entity: {}", request.registration_number);
    
    let service = ValidationService::new();
    
    match service.validate_business_entity(request).await {
        Ok(response) => Ok(ResponseJson(ApiResponse::success(response))),
        Err(e) => {
            tracing::error!("Failed to validate business entity: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}

pub async fn validate_tax_calculation(
    Json(request): Json<TaxCalculationRequest>,
) -> Result<ResponseJson<ApiResponse<ValidationResponse>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Validating tax calculation with {} invoices", request.invoice_data.invoices.len());
    
    let service = ValidationService::new();
    
    match service.validate_tax_calculation(request).await {
        Ok(response) => Ok(ResponseJson(ApiResponse::success(response))),
        Err(e) => {
            tracing::error!("Failed to validate tax calculation: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}

pub async fn comprehensive_validation(
    Json(request): Json<ComprehensiveValidationRequest>,
) -> Result<ResponseJson<ApiResponse<ComprehensiveValidationResponse>>, (StatusCode, ResponseJson<ErrorResponse>)> {
    tracing::info!("Performing comprehensive validation");
    
    let service = ValidationService::new();
    
    match service.comprehensive_validation(request).await {
        Ok(response) => Ok(ResponseJson(ApiResponse::success(response))),
        Err(e) => {
            tracing::error!("Failed to perform comprehensive validation: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string()))
            ))
        }
    }
}