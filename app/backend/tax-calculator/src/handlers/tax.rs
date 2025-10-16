use axum::{extract::Json, http::StatusCode, response::Json as ResponseJson};

use crate::dto::TaxCalculationResponseDto;
use crate::dto::{ErrorResponse, InvoiceData};
use crate::services::zk_proof::generate_zk_proof;
use crate::services::TaxCalculationService;

pub async fn calculate_tax(
    Json(invoice_data): Json<InvoiceData>,
) -> Result<ResponseJson<TaxCalculationResponseDto>, (StatusCode, ResponseJson<ErrorResponse>)> {
    println!("Received invoice data: {:?}", invoice_data);

    let service = TaxCalculationService::new();

    match service.calculate_tax(invoice_data).await {
        Ok(response) => Ok(ResponseJson(response)),
        Err(error) => {
            let status_code = match error.error_code.as_deref() {
                Some("EMPTY_INVOICES") => StatusCode::BAD_REQUEST,
                Some("NEGATIVE_PROFIT") => StatusCode::BAD_REQUEST,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            Err((status_code, ResponseJson(error)))
        }
    }
}
