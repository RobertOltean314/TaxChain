use actix_web::{HttpResponse, Responder, get, web};
use serde::Serialize;
use serde_json::json;
use sqlx::PgPool;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct PublicEntitySummary {
    pub name: String,
    pub fiscal_code: String,
    pub entity_type: String,
    pub proof_count: i64,
}

/// `GET /entitati/publice` — public, no auth required.
///
/// Returns all registered PF + PJ entities with their public identifiers and
/// proof count. Used by the landing page for client-side live search.
/// Sensitive fields (CNP details, IBAN, address) are NOT included.
#[get("/entitati/publice")]
pub async fn list_public_entities(pool: web::Data<PgPool>) -> impl Responder {
    let result = sqlx::query_as::<_, PublicEntitySummary>(
        r#"
        SELECT
            prenume || ' ' || nume AS name,
            cnp                    AS fiscal_code,
            'PF'                   AS entity_type,
            COUNT(d.id)            AS proof_count
        FROM persoana_fizica pf
        LEFT JOIN dovada_fiscala d
               ON d.entity_type = 'PF' AND d.entity_id = pf.id
        GROUP BY pf.id, pf.prenume, pf.nume, pf.cnp

        UNION ALL

        SELECT
            denumire   AS name,
            cod_fiscal AS fiscal_code,
            'PJ'       AS entity_type,
            COUNT(d.id) AS proof_count
        FROM persoana_juridica pj
        LEFT JOIN dovada_fiscala d
               ON d.entity_type = 'PJ' AND d.entity_id = pj.id
        GROUP BY pj.id, pj.denumire, pj.cod_fiscal

        ORDER BY name
        "#,
    )
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => {
            eprintln!("list_public_entities error: {e}");
            HttpResponse::InternalServerError()
                .json(json!({ "error": "Failed to load entities" }))
        }
    }
}
