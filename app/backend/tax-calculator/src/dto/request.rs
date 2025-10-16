use serde::{Deserialize, Serialize};

use crate::models::CountryCode;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceItemDto {
    pub amount: f64,
    pub invoice_type: InvoiceTypeDto,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InvoiceTypeDto {
    Income,
    Expense,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceData {
    pub invoices: Vec<InvoiceItemDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxCalculationRequest {
    pub invoice_data: InvoiceData,
    pub tax_year: Option<i32>,
    pub country_code: Option<CountryCode>,
}
