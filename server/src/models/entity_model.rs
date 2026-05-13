use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A row in the `accountant_entity` join table.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AccountantEntity {
    pub id: Uuid,
    pub user_id: Uuid,
    pub entity_type: String,
    pub pf_id: Option<Uuid>,
    pub pj_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

/// Flattened view sent to the frontend — merges accountant_entity with PF/PJ name + fiscal code.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntitySummary {
    /// `accountant_entity.id` — used to remove the link
    pub id: Uuid,
    pub entity_type: String,
    /// The actual PF or PJ UUID
    pub entity_id: Uuid,
    /// Display name: PF → "Prenume Nume", PJ → denumire
    pub name: String,
    /// PF → CNP, PJ → cod_fiscal
    pub fiscal_code: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AddEntityRequest {
    /// "PF" or "PJ"
    pub entity_type: String,
    pub entity_id: Uuid,
}

/// Parsed from the `X-Entity-Type` / `X-Entity-Id` request headers.
#[derive(Debug, Clone)]
pub struct EntityContext {
    pub entity_type: String, // "PF" | "PJ"
    pub entity_id: Uuid,
}
