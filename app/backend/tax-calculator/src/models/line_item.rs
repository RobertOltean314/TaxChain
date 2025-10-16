use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineItem {
    pub description: String,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub total_price: Decimal,
    pub tax_rate: Option<Decimal>,
    pub tax_amount: Option<Decimal>,
}
