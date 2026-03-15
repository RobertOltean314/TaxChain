use actix_web::{HttpRequest, HttpResponse, Responder, delete, get, post, put, web};
use serde_json::json;
use uuid::Uuid;
use validator::Validate;

use crate::auth::middleware::require_role;
use crate::models::{Partner, PartnerRequest, UserRole};
use crate::services::partner_service::DynPartnerRepository;

#[get("")]
pub async fn find_all_partener(
    req: HttpRequest,
    repo: web::Data<DynPartnerRepository>,
) -> impl Responder {
    let user = match require_role(
        &req,
        &[UserRole::Admin, UserRole::Auditor, UserRole::Taxpayer],
    ) {
        Ok(u) => u,
        Err(resp) => return resp,
    };

    let user_id = match user.claims().user_id() {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(json!({ "error": "Invalid user ID in token" }));
        }
    };

    match repo.find_all_for_user(user_id).await {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(e) => {
            eprintln!("find_all_partener error: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to retrieve partners",
                "details": e.to_string()
            }))
        }
    }
}

/// GET /partener/:id
#[get("/{id}")]
pub async fn get_partener_by_id(
    req: HttpRequest,
    repo: web::Data<DynPartnerRepository>,
    path: web::Path<Uuid>,
) -> impl Responder {
    if let Err(resp) = require_role(
        &req,
        &[UserRole::Admin, UserRole::Auditor, UserRole::Taxpayer],
    ) {
        return resp;
    }

    let id = path.into_inner();

    match repo.find_by_id(id).await {
        Ok(Some(p)) => HttpResponse::Ok().json(p),
        Ok(None) => HttpResponse::NotFound().json(json!({
            "error": format!("Partener with id {} not found", id)
        })),
        Err(e) => {
            eprintln!("get_partener_by_id error: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to retrieve partner",
                "details": e.to_string()
            }))
        }
    }
}

/// POST /partener — create a new partner (any authenticated role).
#[post("")]
pub async fn create_partener(
    req: HttpRequest,
    repo: web::Data<DynPartnerRepository>,
    body: web::Json<PartnerRequest>,
) -> impl Responder {
    let user = match require_role(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(u) => u,
        Err(resp) => return resp,
    };

    if let Err(errors) = body.validate() {
        return HttpResponse::UnprocessableEntity().json(json!({
            "error": "Validation failed",
            "details": errors.to_string()
        }));
    }

    let user_id = match user.claims().user_id() {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(json!({ "error": "Invalid user ID in token" }));
        }
    };

    let partener = Partner::from_request(body.into_inner(), user_id);

    match repo.create(partener).await {
        Ok(created) => HttpResponse::Created().json(created),
        Err(e) => {
            eprintln!("create_partener error: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to create partner",
                "details": e.to_string()
            }))
        }
    }
}

/// PUT /partener/:id — update an existing partner.
/// Users can only update their own partners; Admin can update any.
#[put("/{id}")]
pub async fn update_partener(
    req: HttpRequest,
    repo: web::Data<DynPartnerRepository>,
    path: web::Path<Uuid>,
    body: web::Json<PartnerRequest>,
) -> impl Responder {
    let user = match require_role(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(u) => u,
        Err(resp) => return resp,
    };

    if let Err(errors) = body.validate() {
        return HttpResponse::UnprocessableEntity().json(json!({
            "error": "Validation failed",
            "details": errors.to_string()
        }));
    }

    let id = path.into_inner();

    let existing = match repo.find_by_id(id).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return HttpResponse::NotFound().json(json!({
                "error": format!("Partener with id {} not found", id)
            }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(json!({
                "error": "Failed to fetch partner",
                "details": e.to_string()
            }));
        }
    };

    let user_id = match user.claims().user_id() {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(json!({ "error": "Invalid user ID in token" }));
        }
    };

    // Non-admin users can only update their own partners
    if user.claims().role != UserRole::Admin && existing.created_by != user_id {
        return HttpResponse::Forbidden().json(json!({
            "error": "Access denied — you can only update your own partners"
        }));
    }

    let updated = Partner::update_from_request(&existing, body.into_inner());

    match repo.update(id, updated, user_id).await {
        Ok(Some(p)) => HttpResponse::Ok().json(p),
        Ok(None) => HttpResponse::NotFound().json(json!({
            "error": format!("Partener with id {} not found", id)
        })),
        Err(e) => {
            eprintln!("update_partener error: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to update partner",
                "details": e.to_string()
            }))
        }
    }
}

/// DELETE /partner/:id
#[delete("/{id}")]
pub async fn delete_partener(
    req: HttpRequest,
    repo: web::Data<DynPartnerRepository>,
    path: web::Path<Uuid>,
) -> impl Responder {
    let user = match require_role(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(u) => u,
        Err(resp) => return resp,
    };

    let id = path.into_inner();

    let existing = match repo.find_by_id(id).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return HttpResponse::NotFound().json(json!({
                "error": format!("Partener with id {} not found", id)
            }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(json!({
                "error": "Failed to fetch partner",
                "details": e.to_string()
            }));
        }
    };

    let user_id = match user.claims().user_id() {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(json!({ "error": "Invalid user ID in token" }));
        }
    };

    if user.claims().role != UserRole::Admin && existing.created_by != user_id {
        return HttpResponse::Forbidden().json(json!({
            "error": "Access denied — you can only delete your own partners"
        }));
    }

    match repo.delete(id, user_id).await {
        Ok(true) => HttpResponse::NoContent().finish(),
        Ok(false) => HttpResponse::NotFound().json(json!({
            "error": format!("Partener with id {} not found", id)
        })),
        Err(e) => {
            eprintln!("delete_partener error: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to delete partner",
                "details": e.to_string()
            }))
        }
    }
}
