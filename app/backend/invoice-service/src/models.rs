use crate::dto::CreateInvoiceRequest;
use anyhow::Result;
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub id: Uuid,
    pub numar_serie: String,
    pub issue_date: NaiveDate,
    pub baza_impozabila: f64,
    pub total_tva: f64,
    pub total_de_plata: f64,
    pub furnizor_cui: String,
    pub cumparator_cui: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl Invoice {
    pub fn from_request(request: CreateInvoiceRequest) -> Result<Self> {
        // Basic calculation (simplified)
        // TODO: Review those calculations
        let baza_impozabila = request.line_items.iter().map(|item| item.total_price).sum();

        let total_tva = request
            .line_items
            .iter()
            .map(|item| item.total_price * item.tax_rate.unwrap_or(0.0))
            .sum();

        let total_de_plata = baza_impozabila + total_tva;

        Ok(Self {
            id: Uuid::new_v4(),
            numar_serie: request.numar_serie,
            issue_date: request
                .issue_date
                .unwrap_or_else(|| chrono::Utc::now().date_naive()),
            baza_impozabila,
            total_tva,
            total_de_plata,
            furnizor_cui: request.furnizor.cui,
            cumparator_cui: request.cumparator.cui,
            created_at: chrono::Utc::now(),
        })
    }
}
