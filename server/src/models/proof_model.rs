use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
pub struct FiscalProof {
    pub id: Uuid,
    pub user_id: Uuid,
    pub entity_type: String,
    pub entity_id: Uuid,
    pub entity_name: String,
    pub entity_fiscal_code: String,
    pub period_from: NaiveDate,
    pub period_to: NaiveDate,

    // VAT
    pub vat_colectat: Decimal,
    pub vat_deductibil: Decimal,
    pub vat_net: Decimal,

    // Revenue / expense totals
    pub venituri_brute: Decimal,
    pub cheltuieli_brute: Decimal,

    // Tax obligations (PF: cas + cass + impozit_venit; PJ: impozit_profit)
    pub cas: Decimal,
    pub cass: Decimal,
    pub impozit_venit: Decimal,
    pub impozit_profit: Decimal,
    pub total_obligatii: Decimal,

    // Proof anchoring
    pub proof_hash: String,
    pub period_hash: String,
    pub tx_hash: String,
    pub block_number: i64,
    pub anchored_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,

    // ZK flag
    pub is_zk: bool,
}
