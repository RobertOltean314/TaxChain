use actix_web::{HttpMessage,
    HttpRequest, HttpResponse, Responder, get,
    web::Data,
};
use serde::Serialize;
use sqlx::PgPool;
use utoipa::ToSchema;

use crate::middleware::WalletClaims;

#[derive(Serialize, ToSchema)]
pub struct MyEntitySummary {
    pub uuid: String,
    pub entity_type: String,
    pub name: String,
    pub stare_fiscala: String,
    pub created_at: String,
}

#[derive(Serialize, ToSchema)]
pub struct DashboardResponse {
    pub wallet_address: String,
    pub entities: Vec<MyEntitySummary>,
    pub total_count: i64,
}

#[utoipa::path(
    get,
    path = "/api/entities/my",
    tag = "entity-dashboard",
    responses(
        (status = 200, description = "User's entities", body = DashboardResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("wallet_auth" = [])
    )
)]
#[get("/my")]
pub async fn get_my_entities(
    req: HttpRequest,
    pool: Data<PgPool>,
) -> impl Responder {
    // Extract wallet address from request extensions
    let wallet_claims = match req.extensions().get::<WalletClaims>() {
        Some(claims) => claims.clone(),
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "No wallet authentication found"
            }));
        }
    };

    let wallet_address = &wallet_claims.wallet_address;

    // Fetch user's persoane_fizice
    let persoane_fizice_result = sqlx::query!(
        r#"
        SELECT 
            uuid::TEXT AS "uuid!",
            'persoana_fizica' AS "entity_type!",
            CONCAT(nume, ' ', prenume) AS "name!",
            stare_fiscala::TEXT AS "stare_fiscala!",
            created_at::TEXT AS "created_at!"
        FROM persoane_fizice
        WHERE owner_wallet_address = $1
        ORDER BY created_at DESC
        "#,
        wallet_address
    )
    .fetch_all(&**pool)
    .await;

    let entities: Vec<MyEntitySummary> = match persoane_fizice_result {
        Ok(rows) => rows.into_iter().map(|row| MyEntitySummary {
            uuid: row.uuid,
            entity_type: row.entity_type,
            name: row.name,
            stare_fiscala: row.stare_fiscala,
            created_at: row.created_at,
        }).collect(),
        Err(e) => {
            log::error!("Dashboard query error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch entities"
            }));
        }
    };

    let total_count = entities.len() as i64;

    HttpResponse::Ok().json(DashboardResponse {
        wallet_address: wallet_address.clone(),
        entities,
        total_count,
    })
}
