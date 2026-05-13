use actix_web::{HttpRequest, HttpResponse, Responder, get, web};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::auth::middleware::require_role;
use crate::models::UserRole;
use crate::services::audit_service::DynAuditRepository;

#[derive(Deserialize)]
pub struct AuditLogQuery {
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub tip: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// `GET /jurnal-audit/intrari` — paginated audit trail (Auditor + Admin only).
///
/// Optional query params: entity_type, entity_id, tip (action prefix match), limit, offset.
#[get("/intrari")]
pub async fn get_audit_log(
    req: HttpRequest,
    audit_repo: web::Data<DynAuditRepository>,
    query: web::Query<AuditLogQuery>,
) -> impl Responder {
    if let Err(r) = require_role(&req, &[UserRole::Admin, UserRole::Auditor]) {
        return r;
    }

    let limit = query.limit.unwrap_or(100).clamp(1, 500);
    let offset = query.offset.unwrap_or(0).max(0);

    match audit_repo
        .list(
            query.entity_type.as_deref(),
            query.entity_id,
            query.tip.as_deref(),
            limit,
            offset,
        )
        .await
    {
        Ok(entries) => HttpResponse::Ok().json(json!({ "entries": entries })),
        Err(e) => {
            eprintln!("get_audit_log error: {e}");
            HttpResponse::InternalServerError()
                .json(json!({ "error": "Failed to retrieve audit log" }))
        }
    }
}
