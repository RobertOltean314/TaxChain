use actix_web::{HttpRequest, HttpResponse, Responder, delete, get, post, web};
use serde_json::json;
use uuid::Uuid;

use crate::auth::middleware::require_role;
use crate::models::audit_model::CreateAuditEntry;
use crate::models::entity_model::AddEntityRequest;
use crate::models::UserRole;
use crate::services::audit_service::DynAuditRepository;
use crate::services::entity_service::DynEntityRepository;

fn user_id_from_req(req: &HttpRequest) -> Result<Uuid, HttpResponse> {
    let user = require_role(req, &[UserRole::Admin, UserRole::Taxpayer])
        .map_err(|r| r)?;
    user.claims()
        .user_id()
        .map_err(|_| HttpResponse::InternalServerError().json(json!({"error": "Invalid JWT user_id"})))
}

/// `GET /entitate/mele` — list all entities the current user manages.
#[get("/mele")]
pub async fn list_my_entities(
    req: HttpRequest,
    repo: web::Data<DynEntityRepository>,
) -> impl Responder {
    let user_id = match user_id_from_req(&req) {
        Ok(id) => id,
        Err(r) => return r,
    };

    match repo.list_for_user(user_id).await {
        Ok(list) => HttpResponse::Ok().json(list),
        Err(e) => {
            eprintln!("list_my_entities error: {e}");
            HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to list entities", "details": e.to_string()}))
        }
    }
}

/// `POST /entitate/adauga` — add a PF or PJ to the user's managed list.
///
/// Body: `{ "entity_type": "PF"|"PJ", "entity_id": "<uuid>" }`
#[post("/adauga")]
pub async fn add_entity(
    req: HttpRequest,
    repo: web::Data<DynEntityRepository>,
    audit_repo: web::Data<DynAuditRepository>,
    body: web::Json<AddEntityRequest>,
) -> impl Responder {
    let user_id = match user_id_from_req(&req) {
        Ok(id) => id,
        Err(r) => return r,
    };

    if body.entity_type != "PF" && body.entity_type != "PJ" {
        return HttpResponse::UnprocessableEntity()
            .json(json!({"error": "entity_type must be 'PF' or 'PJ'"}));
    }

    match repo.add(user_id, body.into_inner()).await {
        Ok(summary) => {
            let audit = audit_repo.clone();
            let link_id = summary.id;
            let entity_type = summary.entity_type.clone();
            let entity_id = summary.entity_id;
            let name = summary.name.clone();
            let fiscal_code = summary.fiscal_code.clone();
            actix_web::rt::spawn(async move {
                let _ = audit.log(CreateAuditEntry {
                    action: "entity.added",
                    actor_user_id: user_id,
                    entity_type: Some(entity_type.clone()),
                    entity_id: Some(entity_id),
                    resource_type: "accountant_entity",
                    resource_id: Some(link_id),
                    payload: json!({
                        "entity_type": entity_type,
                        "entity_id": entity_id,
                        "name": name,
                        "fiscal_code": fiscal_code,
                    }),
                }).await;
            });
            HttpResponse::Created().json(summary)
        }
        Err(e) => {
            eprintln!("add_entity error: {e}");
            HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to add entity", "details": e.to_string()}))
        }
    }
}

/// `DELETE /entitate/:id` — remove an entity from the user's managed list.
///
/// `:id` is `accountant_entity.id`, not the PF/PJ id.
#[delete("/{id}")]
pub async fn remove_entity(
    req: HttpRequest,
    repo: web::Data<DynEntityRepository>,
    audit_repo: web::Data<DynAuditRepository>,
    path: web::Path<Uuid>,
) -> impl Responder {
    let user_id = match user_id_from_req(&req) {
        Ok(id) => id,
        Err(r) => return r,
    };

    let id = path.into_inner();

    // Fetch entity info before removal so it can be included in the audit entry.
    let entity_summary = repo.list_for_user(user_id).await.ok()
        .and_then(|list| list.into_iter().find(|e| e.id == id));

    match repo.remove(id, user_id).await {
        Ok(true) => {
            let audit = audit_repo.clone();
            let (entity_type, entity_id, name, fiscal_code) = entity_summary
                .map(|s| (Some(s.entity_type), Some(s.entity_id), s.name, s.fiscal_code))
                .unwrap_or((None, None, String::new(), String::new()));
            actix_web::rt::spawn(async move {
                let _ = audit.log(CreateAuditEntry {
                    action: "entity.removed",
                    actor_user_id: user_id,
                    entity_type: entity_type.clone(),
                    entity_id,
                    resource_type: "accountant_entity",
                    resource_id: Some(id),
                    payload: json!({
                        "entity_type": entity_type,
                        "entity_id": entity_id,
                        "name": name,
                        "fiscal_code": fiscal_code,
                    }),
                }).await;
            });
            HttpResponse::NoContent().finish()
        }
        Ok(false) => HttpResponse::NotFound()
            .json(json!({"error": "Entity link not found or not owned by you"})),
        Err(e) => {
            eprintln!("remove_entity error: {e}");
            HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to remove entity", "details": e.to_string()}))
        }
    }
}
