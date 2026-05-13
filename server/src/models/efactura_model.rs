use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::io;
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
    created_at: DateTime<Utc>,
    processed_at: Option<DateTime<Utc>>,
}

fn decode_error(msg: String) -> sqlx::Error {
    sqlx::Error::Decode(Box::new(io::Error::new(io::ErrorKind::InvalidData, msg)))
}

pub fn row_to_model(row: EFacturaRow) -> Result<EFacturaMessage, sqlx::Error> {
    let status = match row.status.as_str() {
        "processing" => EFacturaStatus::Processing,
        "ok" => EFacturaStatus::Ok,
        "error" => EFacturaStatus::Error,
        other => return Err(decode_error(format!("Invalid efactura status: {other}"))),
    };

    Ok(EFacturaMessage {
        id: row.id,
        cif_emitent: row.cif_emitent,
        xml: row.xml,
        status,
        error_message: row.error_message,
        created_at: row.created_at,
        processed_at: row.processed_at,
    })
}
