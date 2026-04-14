use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum EFacturaStatus {
    Processing,
    Ok,
    Error,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EFacturaMessage {
    pub id: Uuid,
    pub cif_emitent: String,
    pub xml: String,
    pub status: EFacturaStatus,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub processed_at: Option<DateTime<Utc>>,
}

use sqlx::FromRow;

#[derive(FromRow)]
struct EFacturaRow {
    id: Uuid,
    cif_emitent: String,
    xml: String,
    status: String,
    error_message: Option<String>,
    created_at: chrono::DateTime<Utc>,
    processed_at: Option<chrono::DateTime<Utc>>,
}
