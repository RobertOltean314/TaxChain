use actix_web::{
    HttpResponse, Responder, get,
    web::{Data, Query},
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::{ToSchema, IntoParams};

#[derive(Deserialize, IntoParams, ToSchema)]
pub struct SearchParams {
    #[param(example = "Popescu")]
    pub query: Option<String>,
    #[param(example = "persoana_fizica")]
    pub entity_type: Option<String>,
    #[param(example = "1")]
    pub page: Option<i64>,
    #[param(example = "20")]
    pub per_page: Option<i64>,
}

#[derive(Serialize, ToSchema)]
pub struct EntitySearchResult {
    pub uuid: String,
    pub entity_type: String,
    pub name: String,
    pub fiscal_code: Option<String>,
    pub registration_date: Option<String>,
    pub stare_fiscala: String,
}

#[derive(Serialize, ToSchema)]
pub struct SearchResponse {
    pub results: Vec<EntitySearchResult>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

#[utoipa::path(
    get,
    path = "/api/entities/search",
    tag = "entity-search",
    params(SearchParams),
    responses(
        (status = 200, description = "Search results", body = SearchResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[get("/search")]
pub async fn search_entities(
    query: Query<SearchParams>,
    pool: Data<PgPool>,
) -> impl Responder {
    let search_query = query.query.as_deref().unwrap_or("");
    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;

    // Search in persoane_fizice
    let persoane_fizice_results = sqlx::query!(
        r#"
        SELECT 
            uuid::TEXT AS "uuid!",
            'persoana_fizica' AS "entity_type!",
            CONCAT(nume, ' ', prenume) AS "name!",
            NULL AS "fiscal_code",
            created_at::TEXT AS "registration_date",
            stare_fiscala::TEXT AS "stare_fiscala!"
        FROM persoane_fizice
        WHERE 
            (LOWER(nume) LIKE LOWER($1) OR LOWER(prenume) LIKE LOWER($1) OR $1 = '')
            AND ($2::TEXT IS NULL OR 'persoana_fizica' = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
        format!("%{}%", search_query),
        query.entity_type.as_deref(),
        per_page,
        offset
    )
    .fetch_all(&**pool)
    .await;

    let results: Vec<EntitySearchResult> = match persoane_fizice_results {
        Ok(rows) => rows.into_iter().map(|row| EntitySearchResult {
            uuid: row.uuid,
            entity_type: row.entity_type,
            name: row.name,
            fiscal_code: row.fiscal_code,
            registration_date: row.registration_date,
            stare_fiscala: row.stare_fiscala,
        }).collect(),
        Err(e) => {
            log::error!("Search error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to search entities"
            }));
        }
    };

    // Count total for pagination
    let total_result = sqlx::query!(
        r#"
        SELECT COUNT(*) AS "count!"
        FROM persoane_fizice
        WHERE 
            (LOWER(nume) LIKE LOWER($1) OR LOWER(prenume) LIKE LOWER($1) OR $1 = '')
            AND ($2::TEXT IS NULL OR 'persoana_fizica' = $2)
        "#,
        format!("%{}%", search_query),
        query.entity_type.as_deref()
    )
    .fetch_one(&**pool)
    .await;

    let total = total_result.map(|r| r.count).unwrap_or(0);

    HttpResponse::Ok().json(SearchResponse {
        results,
        total,
        page,
        per_page,
    })
}
