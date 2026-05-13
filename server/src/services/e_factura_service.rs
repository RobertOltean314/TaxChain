use std::io;
use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::efactura_model::{EFacturaMessage, EFacturaStatus};

const SELECT_COLS: &str = "
    SELECT id, cif_emitent, xml, status::text AS status,
           error_message, created_at, processed_at
    FROM efactura_messages
";

const CREATE_QUERY: &str = "
    INSERT INTO efactura_messages
        (id, cif_emitent, xml, status, error_message, created_at, processed_at)
    VALUES ($1, $2, $3, $4::efactura_status, $5, $6, $7)
    RETURNING id, cif_emitent, xml, status::text AS status,
              error_message, created_at, processed_at
";

const UPDATE_STATUS_QUERY: &str = "
    UPDATE efactura_messages
    SET status = $1::efactura_status, error_message = $2, processed_at = $3
    WHERE id = $4
    RETURNING id, cif_emitent, xml, status::text AS status,
              error_message, created_at, processed_at
";

#[derive(sqlx::FromRow)]
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

fn row_to_model(row: EFacturaRow) -> Result<EFacturaMessage, sqlx::Error> {
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

#[async_trait]
pub trait EFacturaRepository: Send + Sync {
    async fn submit_invoice(
        &self,
        cif_emitent: String,
        xml: String,
    ) -> Result<EFacturaMessage, sqlx::Error>;
    async fn update_status(
        &self,
        id: Uuid,
        status: EFacturaStatus,
        error_message: Option<String>,
    ) -> Result<EFacturaMessage, sqlx::Error>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<EFacturaMessage>, sqlx::Error>;
    async fn find_by_cif(&self, cif: &str) -> Result<Vec<EFacturaMessage>, sqlx::Error>;
}

pub type DynEFacturaRepository = Arc<dyn EFacturaRepository>;

pub struct PgEFacturaRepository {
    pool: PgPool,
}

impl PgEFacturaRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl EFacturaRepository for PgEFacturaRepository {
    async fn submit_invoice(
        &self,
        cif_emitent: String,
        xml: String,
    ) -> Result<EFacturaMessage, sqlx::Error> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let row = sqlx::query_as::<_, EFacturaRow>(CREATE_QUERY)
            .bind(id)
            .bind(&cif_emitent)
            .bind(&xml)
            .bind("processing")
            .bind(None::<String>)
            .bind(now)
            .bind(None::<DateTime<Utc>>)
            .fetch_one(&self.pool)
            .await?;

        row_to_model(row)
    }

    async fn update_status(
        &self,
        id: Uuid,
        status: EFacturaStatus,
        error_message: Option<String>,
    ) -> Result<EFacturaMessage, sqlx::Error> {
        let processed_at = Utc::now();
        let status_str = match status {
            EFacturaStatus::Processing => "processing",
            EFacturaStatus::Ok => "ok",
            EFacturaStatus::Error => "error",
        };

        let row = sqlx::query_as::<_, EFacturaRow>(UPDATE_STATUS_QUERY)
            .bind(status_str)
            .bind(error_message)
            .bind(processed_at)
            .bind(id)
            .fetch_one(&self.pool)
            .await?;

        row_to_model(row)
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<EFacturaMessage>, sqlx::Error> {
        let query = format!("{} WHERE id = $1", SELECT_COLS);
        let row = sqlx::query_as::<_, EFacturaRow>(&query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(r) => Ok(Some(row_to_model(r)?)),
            None => Ok(None),
        }
    }

    async fn find_by_cif(&self, cif: &str) -> Result<Vec<EFacturaMessage>, sqlx::Error> {
        let query = format!(
            "{} WHERE cif_emitent = $1 ORDER BY created_at DESC",
            SELECT_COLS
        );
        let rows = sqlx::query_as::<_, EFacturaRow>(&query)
            .bind(cif)
            .fetch_all(&self.pool)
            .await?;

        let mut messages = Vec::new();
        for row in rows {
            messages.push(row_to_model(row)?);
        }
        Ok(messages)
    }
}
