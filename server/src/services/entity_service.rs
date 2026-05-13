use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::models::entity_model::{AddEntityRequest, EntitySummary};

// ============================================================================
// INTERNAL DB ROW
// ============================================================================

#[derive(FromRow)]
struct EntityRow {
    id: Uuid,
    entity_id: Option<Uuid>,
    name: Option<String>,
    fiscal_code: Option<String>,
    created_at: DateTime<Utc>,
}

// ============================================================================
// TRAIT
// ============================================================================

#[async_trait]
pub trait EntityRepository: Send + Sync {
    async fn list_for_user(&self, user_id: Uuid) -> Result<Vec<EntitySummary>, sqlx::Error>;

    async fn add(&self, user_id: Uuid, req: AddEntityRequest)
    -> Result<EntitySummary, sqlx::Error>;

    async fn remove(&self, id: Uuid, user_id: Uuid) -> Result<bool, sqlx::Error>;

    async fn has_access(
        &self,
        user_id: Uuid,
        entity_type: &str,
        entity_id: Uuid,
    ) -> Result<bool, sqlx::Error>;
}

pub type DynEntityRepository = Arc<dyn EntityRepository>;

// ============================================================================
// POSTGRES IMPLEMENTATION
// ============================================================================

pub struct PgEntityRepository {
    pool: PgPool,
}

impl PgEntityRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl EntityRepository for PgEntityRepository {
    async fn list_for_user(&self, user_id: Uuid) -> Result<Vec<EntitySummary>, sqlx::Error> {
        let pf_rows: Vec<EntityRow> = sqlx::query_as(
            r#"
            SELECT ae.id, ae.pf_id AS entity_id, ae.created_at,
                   pf.prenume || ' ' || pf.nume AS name,
                   pf.cnp AS fiscal_code
            FROM accountant_entity ae
            JOIN persoana_fizica pf ON pf.id = ae.pf_id
            WHERE ae.user_id = $1 AND ae.entity_type = 'PF'
            ORDER BY name
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        let pj_rows: Vec<EntityRow> = sqlx::query_as(
            r#"
            SELECT ae.id, ae.pj_id AS entity_id, ae.created_at,
                   pj.denumire AS name,
                   pj.cod_fiscal AS fiscal_code
            FROM accountant_entity ae
            JOIN persoana_juridica pj ON pj.id = ae.pj_id
            WHERE ae.user_id = $1 AND ae.entity_type = 'PJ'
            ORDER BY name
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        let mut result: Vec<EntitySummary> = pf_rows
            .into_iter()
            .map(|r| EntitySummary {
                id: r.id,
                entity_type: "PF".into(),
                entity_id: r.entity_id.unwrap_or_default(),
                name: r.name.unwrap_or_default(),
                fiscal_code: r.fiscal_code.unwrap_or_default(),
                created_at: r.created_at,
            })
            .collect();

        result.extend(pj_rows.into_iter().map(|r| EntitySummary {
            id: r.id,
            entity_type: "PJ".into(),
            entity_id: r.entity_id.unwrap_or_default(),
            name: r.name.unwrap_or_default(),
            fiscal_code: r.fiscal_code.unwrap_or_default(),
            created_at: r.created_at,
        }));

        result.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(result)
    }

    async fn add(
        &self,
        user_id: Uuid,
        req: AddEntityRequest,
    ) -> Result<EntitySummary, sqlx::Error> {
        let new_id = Uuid::new_v4();

        match req.entity_type.as_str() {
            "PF" => {
                sqlx::query(
                    r#"
                    INSERT INTO accountant_entity (id, user_id, entity_type, pf_id)
                    VALUES ($1, $2, 'PF', $3)
                    ON CONFLICT (user_id, pf_id) DO NOTHING
                    "#,
                )
                .bind(new_id)
                .bind(user_id)
                .bind(req.entity_id)
                .execute(&self.pool)
                .await?;

                let row: EntityRow = sqlx::query_as(
                    r#"
                    SELECT ae.id, ae.pf_id AS entity_id, ae.created_at,
                           pf.prenume || ' ' || pf.nume AS name,
                           pf.cnp AS fiscal_code
                    FROM accountant_entity ae
                    JOIN persoana_fizica pf ON pf.id = ae.pf_id
                    WHERE ae.user_id = $1 AND ae.pf_id = $2
                    "#,
                )
                .bind(user_id)
                .bind(req.entity_id)
                .fetch_one(&self.pool)
                .await?;

                Ok(EntitySummary {
                    id: row.id,
                    entity_type: "PF".into(),
                    entity_id: row.entity_id.unwrap_or_default(),
                    name: row.name.unwrap_or_default(),
                    fiscal_code: row.fiscal_code.unwrap_or_default(),
                    created_at: row.created_at,
                })
            }

            "PJ" => {
                sqlx::query(
                    r#"
                    INSERT INTO accountant_entity (id, user_id, entity_type, pj_id)
                    VALUES ($1, $2, 'PJ', $3)
                    ON CONFLICT (user_id, pj_id) DO NOTHING
                    "#,
                )
                .bind(new_id)
                .bind(user_id)
                .bind(req.entity_id)
                .execute(&self.pool)
                .await?;

                let row: EntityRow = sqlx::query_as(
                    r#"
                    SELECT ae.id, ae.pj_id AS entity_id, ae.created_at,
                           pj.denumire AS name,
                           pj.cod_fiscal AS fiscal_code
                    FROM accountant_entity ae
                    JOIN persoana_juridica pj ON pj.id = ae.pj_id
                    WHERE ae.user_id = $1 AND ae.pj_id = $2
                    "#,
                )
                .bind(user_id)
                .bind(req.entity_id)
                .fetch_one(&self.pool)
                .await?;

                Ok(EntitySummary {
                    id: row.id,
                    entity_type: "PJ".into(),
                    entity_id: row.entity_id.unwrap_or_default(),
                    name: row.name.unwrap_or_default(),
                    fiscal_code: row.fiscal_code.unwrap_or_default(),
                    created_at: row.created_at,
                })
            }

            _ => Err(sqlx::Error::Protocol("Invalid entity_type".into())),
        }
    }

    async fn remove(&self, id: Uuid, user_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM accountant_entity WHERE id=$1 AND user_id=$2")
            .bind(id)
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    async fn has_access(
        &self,
        user_id: Uuid,
        entity_type: &str,
        entity_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        match entity_type {
            "PF" => {
                sqlx::query_scalar::<_, bool>(
                    r#"
                    SELECT EXISTS (
                        SELECT 1 FROM accountant_entity
                        WHERE user_id=$1 AND entity_type='PF' AND pf_id=$2
                    )
                    "#,
                )
                .bind(user_id)
                .bind(entity_id)
                .fetch_one(&self.pool)
                .await
            }

            "PJ" => {
                sqlx::query_scalar::<_, bool>(
                    r#"
                    SELECT EXISTS (
                        SELECT 1 FROM accountant_entity
                        WHERE user_id=$1 AND entity_type='PJ' AND pj_id=$2
                    )
                    "#,
                )
                .bind(user_id)
                .bind(entity_id)
                .fetch_one(&self.pool)
                .await
            }

            _ => Ok(false),
        }
    }
}
