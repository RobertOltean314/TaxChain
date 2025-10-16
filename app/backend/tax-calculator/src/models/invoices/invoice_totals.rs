use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceTotals {
    pub subtotal: Decimal,
    pub tax_amount: Decimal,
    pub total: Decimal,
    pub currency: String,
}
