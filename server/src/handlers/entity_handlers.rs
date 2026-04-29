use actix_web::{HttpRequest, HttpResponse, Responder, delete, get, post, web};
use serde_json::json;
use uuid::Uuid;

use crate::auth::middleware::require_role;
use crate::models::entity_model::AddEntityRequest;
use crate::models::UserRole;
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
        Ok(summary) => HttpResponse::Created().json(summary),
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
    path: web::Path<Uuid>,
) -> impl Responder {
    let user_id = match user_id_from_req(&req) {
        Ok(id) => id,
        Err(r) => return r,
    };

    let id = path.into_inner();

    match repo.remove(id, user_id).await {
        Ok(true) => HttpResponse::NoContent().finish(),
        Ok(false) => HttpResponse::NotFound()
            .json(json!({"error": "Entity link not found or not owned by you"})),
        Err(e) => {
            eprintln!("remove_entity error: {e}");
            HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to remove entity", "details": e.to_string()}))
        }
    }
}
