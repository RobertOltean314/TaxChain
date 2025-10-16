#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("Invalid CUI: {0}")]
    InvalidCUI(String),
    #[error("VAT calculation mismatch")]
    VatCalculationMismatch,
    #[error("Total amount mismatch")]
    TotalMismatch,
}
