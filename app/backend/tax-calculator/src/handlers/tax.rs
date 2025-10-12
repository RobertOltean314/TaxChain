use axum::{
    extract::Json,
    http::StatusCode,
    response::Json as ResponseJson,
};

use crate::models::{InvoiceData, InvoiceType, TaxCalculationResponse, ErrorResponse};
use crate::services::zk_proof::generate_zk_proof;

pub async fn calculate_tax(
    Json(invoice_data): Json<InvoiceData>,
) -> Result<ResponseJson<TaxCalculationResponse>, (StatusCode, ResponseJson<ErrorResponse>)> {
    println!("Received invoice data: {:?}", invoice_data);


    let mut total_income = 0.0;
    let mut total_expenses = 0.0;

    for invoice in &invoice_data.invoices {
        match invoice.invoice_type {
            InvoiceType::Income => total_income += invoice.amount,
            InvoiceType::Expense => total_expenses += invoice.amount,
        }
    }


    let profit = total_income - total_expenses;
    
    if profit < 0.0 {
        return Err((
            StatusCode::BAD_REQUEST,
            ResponseJson(ErrorResponse {
                error: "Negative profit not allowed. Expenses cannot exceed income.".to_string(),
            }),
        ));
    }

    let tax_rate = 0.10;
    let tax_owed = profit * tax_rate;

    let zk_proof_generated = generate_zk_proof(total_income, total_expenses, tax_owed).await;

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
