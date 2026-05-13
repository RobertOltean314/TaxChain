use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::audit_model::{AuditLogEntry, CreateAuditEntry};

pub type DynAuditRepository = Arc<dyn AuditRepository + Send + Sync>;

#[async_trait]
pub trait AuditRepository {
    async fn log(&self, entry: CreateAuditEntry) -> Result<(), sqlx::Error>;
    async fn list(
        &self,
        entity_type: Option<&str>,
        entity_id: Option<Uuid>,
        action_prefix: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<AuditLogEntry>, sqlx::Error>;
}

// ============================================================================
// POSTGRES IMPLEMENTATION
// ============================================================================

pub struct PgAuditRepository {
    pool: PgPool,
}

impl PgAuditRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[derive(sqlx::FromRow)]
struct AuditLogRow {
    id: Uuid,
    action: String,
    actor_user_id: Uuid,
    actor_name: Option<String>,
    entity_type: Option<String>,
    entity_id: Option<Uuid>,
    resource_type: String,
    resource_id: Option<Uuid>,
    payload: String,
    created_at: DateTime<Utc>,
}

impl AuditLogRow {
    fn into_entry(self) -> AuditLogEntry {
        AuditLogEntry {
            id: self.id,
            action: self.action,
            actor_user_id: self.actor_user_id,
            actor_name: self.actor_name,
            entity_type: self.entity_type,
            entity_id: self.entity_id,
            resource_type: self.resource_type,
            resource_id: self.resource_id,
            payload: serde_json::from_str(&self.payload)
                .unwrap_or(serde_json::Value::Object(Default::default())),
            created_at: self.created_at,
        }
    }
}

#[async_trait]
impl AuditRepository for PgAuditRepository {
    async fn log(&self, entry: CreateAuditEntry) -> Result<(), sqlx::Error> {
        let payload_str =
            serde_json::to_string(&entry.payload).unwrap_or_else(|_| "{}".to_string());
        sqlx::query(
            r#"
            INSERT INTO audit_log
                (action, actor_user_id, entity_type, entity_id,
                 resource_type, resource_id, payload)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(entry.action)
        .bind(entry.actor_user_id)
        .bind(&entry.entity_type)
        .bind(entry.entity_id)
        .bind(entry.resource_type)
        .bind(entry.resource_id)
        .bind(&payload_str)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn list(
        &self,
        entity_type: Option<&str>,
        entity_id: Option<Uuid>,
        action_prefix: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<AuditLogEntry>, sqlx::Error> {
        // Use IS NULL / = pattern for optional filter columns
        let action_pattern = action_prefix.map(|p| format!("{p}%"));

        let rows = sqlx::query_as::<_, AuditLogRow>(
            r#"
            SELECT
                al.id,
                al.action,
                al.actor_user_id,
                COALESCE(u.display_name, u.email, u.wallet_address) AS actor_name,
                al.entity_type,
                al.entity_id,
                al.resource_type,
                al.resource_id,
                al.payload,
                al.created_at
            FROM audit_log al
            LEFT JOIN users u ON u.id = al.actor_user_id
            WHERE ($1::varchar IS NULL OR al.entity_type = $1)
              AND ($2::uuid   IS NULL OR al.entity_id   = $2)
              AND ($3::varchar IS NULL OR al.action LIKE $3)
            ORDER BY al.created_at DESC
            LIMIT $4 OFFSET $5
            "#,
        )
        .bind(entity_type)
        .bind(entity_id)
        .bind(&action_pattern)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.into_entry()).collect())
    }
}
