use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfitTaxResult {
    pub revenue: Decimal,
    pub expenses: Decimal,
    pub profit: Decimal,
    pub tax_rate: Decimal,
    pub tax_amount: Decimal,
    pub cui: String,
}
