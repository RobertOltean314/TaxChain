use crate::services::TaxCalculationService;
use axum::{
    extract::{Json, Path},
    http::StatusCode,
    response::Json as ResponseJson,
};
use common_types::{
    ApiResponse, CountryCode, ErrorResponse, TaxCalculationRequest, TaxCalculationResponse,
};

pub async fn health() -> ResponseJson<serde_json::Value> {
    ResponseJson(serde_json::json!({
        "status": "healthy",
        "service": "tax-calculation-service",
        "version": "0.1.0",
        "port": 8002
    }))
}

pub async fn calculate_tax(
    Json(request): Json<TaxCalculationRequest>,
) -> Result<
    ResponseJson<ApiResponse<TaxCalculationResponse>>,
    (StatusCode, ResponseJson<ErrorResponse>),
> {
    tracing::info!(
        "Calculating tax for {} invoices",
        request.invoice_data.invoices.len()
    );

    let service = match TaxCalculationService::new() {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to initialize TaxCalculationService: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ));
        }
    };

    match service.calculate_tax(request).await {
        Ok(response) => Ok(ResponseJson(ApiResponse::success(response))),
        Err(e) => {
            tracing::error!("Failed to calculate tax: {}", e);
            Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}

pub async fn get_tax_rates(
) -> Result<ResponseJson<ApiResponse<serde_json::Value>>, (StatusCode, ResponseJson<ErrorResponse>)>
{
    tracing::info!("Fetching tax rates");

    let service = match TaxCalculationService::new() {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to initialize TaxCalculationService: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ));
        }
    };

    match service.get_available_tax_rates().await {
        Ok(rates) => Ok(ResponseJson(ApiResponse::success(rates))),
        Err(e) => {
            tracing::error!("Failed to get tax rates: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}

pub async fn get_tax_rates_by_country(
    Path(country_code): Path<String>,
) -> Result<ResponseJson<ApiResponse<serde_json::Value>>, (StatusCode, ResponseJson<ErrorResponse>)>
{
    tracing::info!("Fetching tax rates for country: {}", country_code);

    let country_code = match country_code.parse::<CountryCode>() {
        Ok(code) => code,
        Err(_) => {
            return Err((
                StatusCode::BAD_REQUEST,
                ResponseJson(ErrorResponse::new("Invalid country code")),
            ));
        }
    };

    let service = match TaxCalculationService::new() {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to initialize TaxCalculationService: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ));
        }
    };

    match service.get_tax_rates_by_country(country_code).await {
        Ok(rates) => Ok(ResponseJson(ApiResponse::success(rates))),
        Err(e) => {
            tracing::error!("Failed to get tax rates for country: {}", e);
            Err((
                StatusCode::NOT_FOUND,
                ResponseJson(ErrorResponse::new(e.to_string())),
            ))
        }
    }
}
