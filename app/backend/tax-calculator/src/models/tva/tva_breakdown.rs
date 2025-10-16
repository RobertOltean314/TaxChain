use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TvaBreakdown {
    pub cota_tva: Decimal, // (e.g: 19%, 9%, 21%)
    pub baza_impozabila: Decimal,
    pub valoare_tva: Decimal,
}
