use crate::models::Invoice;
use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoiceRequest {
    pub numar_serie: String,
    pub issue_date: Option<NaiveDate>,
    pub furnizor: BusinessEntityDto,
    pub cumparator: BusinessEntityDto,
    pub line_items: Vec<LineItemDto>,
}

// TODO: Adapt business entity struct to ROmanian Business Entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessEntityDto {
    pub nume: String,
    pub cui: String,
    pub adresa: String,
    pub platitor_tva: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineItemDto {
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price: f64,
    pub tax_rate: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceResponse {
    pub id: Uuid,
    pub numar_serie: String,
    pub issue_date: NaiveDate,
    pub baza_impozabila: Decimal,
    pub total_tva: Decimal,
    pub total_de_plata: Decimal,
    pub furnizor_cui: String,
    pub cumparator_cui: String,
    pub created_at: String,
}

impl InvoiceResponse {
    pub fn from_invoice(invoice: Invoice) -> Self {
        Self {
            id: invoice.id,
            numar_serie: invoice.numar_serie,
            issue_date: invoice.issue_date,
            baza_impozabila: invoice.baza_impozabila,
            total_tva: invoice.total_tva,
            total_de_plata: invoice.total_de_plata,
            furnizor_cui: invoice.furnizor_cui,
            cumparator_cui: invoice.cumparator_cui,
            created_at: invoice.created_at.to_rfc3339(),
        }
    }
}
