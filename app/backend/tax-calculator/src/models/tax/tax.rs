use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct TaxCalculationResponse {
    pub total_income: f64,
    pub total_expenses: f64,
    pub profit: f64,
    pub tax_owed: f64,
    pub tax_rate: f64,
    pub zk_proof_generated: bool,
}
