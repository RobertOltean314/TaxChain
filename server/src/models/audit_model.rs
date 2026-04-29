use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
pub struct AuditLogEntry {
    pub id: Uuid,
    pub action: String,
    pub actor_user_id: Uuid,
    pub actor_name: Option<String>,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub resource_type: String,
    pub resource_id: Option<Uuid>,
    pub payload: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

pub struct CreateAuditEntry {
    pub action: &'static str,
    pub actor_user_id: Uuid,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub resource_type: &'static str,
    pub resource_id: Option<Uuid>,
    pub payload: serde_json::Value,
}
