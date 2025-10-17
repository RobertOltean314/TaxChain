use crate::{CountryCode, InvoiceData};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxCalculationRequest {
    pub invoice_data: InvoiceData,
    pub tax_year: Option<i32>,
    pub country_code: Option<CountryCode>,
    pub business_entity_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxCalculationResponse {
    pub total_income: f64,
    pub total_expenses: f64,
    pub profit: f64,
    pub tax_owed: f64,
    pub tax_rate: f64,
    pub zk_proof_generated: bool,
    pub calculation_id: String,
    pub timestamp: String,
    pub breakdown: TaxBreakdown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxBreakdown {
    pub income_tax: f64,
    pub social_security_tax: f64,
    pub health_insurance_tax: f64,
    pub other_taxes: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxRateRequest {
    pub country_code: CountryCode,
    pub entity_type: Option<String>,
    pub income_bracket: Option<f64>,
}
