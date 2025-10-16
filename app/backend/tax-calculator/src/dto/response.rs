use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub error_code: Option<String>,
    pub details: Option<serde_json::Value>,
}

impl ErrorResponse {
    pub fn new(error: impl Into<String>) -> Self {
        Self {
            error: error.into(),
            error_code: None,
            details: None,
        }
    }

    pub fn with_code(mut self, code: impl Into<String>) -> Self {
        self.error_code = Some(code.into());
        self
    }

    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxCalculationResponseDto {
    pub total_income: f64,
    pub total_expenses: f64,
    pub profit: f64,
    pub tax_owed: f64,
    pub tax_rate: f64,
    pub zk_proof_generated: bool,
    pub calculation_id: Option<String>,
    pub timestamp: String,
}
