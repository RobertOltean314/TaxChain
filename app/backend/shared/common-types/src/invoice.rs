use crate::CountryCode;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceItem {
    pub amount: f64,
    pub invoice_type: InvoiceType,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InvoiceType {
    Income,
    Expense,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceData {
    pub invoices: Vec<InvoiceItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoiceRequest {
    pub numar_serie: String,
    pub data_emiterii: DateTime<Utc>,
    pub furnizor: String,
    pub beneficiar: String,
    pub total_valoare: f64,
    pub total_tva: f64,
    pub invoice_type: InvoiceType,
    pub descriere: Option<String>,
    pub country_code: Option<CountryCode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceResponse {
    pub id: String,
    pub numar_serie: String,
    pub data_emiterii: DateTime<Utc>,
    pub furnizor: String,
    pub beneficiar: String,
    pub total_valoare: f64,
    pub total_tva: f64,
    pub invoice_type: InvoiceType,
    pub descriere: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
