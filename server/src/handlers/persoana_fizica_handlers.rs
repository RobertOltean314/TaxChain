use actix_web::{HttpRequest, HttpResponse, Responder, delete, get, post, put, web};
use serde_json::json;
use uuid::Uuid;
use validator::Validate;

use crate::auth::middleware::require_role;
use crate::models::{PersoanaFizica, PersoanaFizicaRequest, UserRole};
use crate::services::persoana_fizica_service::DynPersoanaFizicaRepository;

/// GET /persoana-fizica — returns all records.
#[get("")]
pub async fn find_all_persoana_fizica(
    req: HttpRequest,
    repo: web::Data<DynPersoanaFizicaRepository>,
) -> impl Responder {
    if let Err(resp) = require_role(&req, &[UserRole::Admin, UserRole::Auditor]) {
        return resp;
    }

    match repo.find_all().await {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(e) => {
            eprintln!("find_all error: {e}");
            let error_body = json!({"error": "Failed to retrieve all Persoana Fizica entities", "details": e.to_string()});
            HttpResponse::InternalServerError().json(error_body)
        }
    }
}

/// GET /persoana-fizica/{id} — returns a single record by UUID.
#[get("/{id}")]
pub async fn get_persoana_fizica_by_id(
    req: HttpRequest,
    repo: web::Data<DynPersoanaFizicaRepository>,
    path: web::Path<Uuid>,
) -> impl Responder {
    let user = match require_role(
        &req,
        &[UserRole::Admin, UserRole::Auditor, UserRole::Taxpayer],
    ) {
        Ok(u) => u,
        Err(resp) => return resp,
    };

    let id = path.into_inner();

    if user.claims().role == UserRole::Taxpayer {
        if user.claims().persoana_fizica_id != Some(id) {
            return HttpResponse::Forbidden().json(json!({
                "error": "Access denied — you can only view your own record"
            }));
        }
    }

    let not_found_error = json!({"error": format!("Persoana Fizica with id {} was not found", id)});
    match repo.find_by_id(id).await {
        Ok(Some(p)) => HttpResponse::Ok().json(p),
        Ok(None) => HttpResponse::NotFound().json(not_found_error),
        Err(e) => {
            eprintln!("find_by_id error: {e}");
            let error_body = json!({
                "error": format!("We couldn't retrieve Persoana Fizica with id: {}, it doesn't exist in our database", id),
                "details": e.to_string()
            });
            HttpResponse::InternalServerError().json(error_body)
        }
    }
}

/// POST /persoana-fizica — creates a new record.
#[post("")]
pub async fn create_persoana_fizica(
    req: HttpRequest,
    repo: web::Data<DynPersoanaFizicaRepository>,
    body: web::Json<PersoanaFizicaRequest>,
) -> impl Responder {
    if let Err(resp) = require_role(&req, &[UserRole::Admin]) {
        return resp;
    }

    if let Err(errors) = body.validate() {
        return HttpResponse::UnprocessableEntity().body(errors.to_string());
    }

    let persoana = PersoanaFizica::from_request(body.into_inner());

    match repo.create(persoana).await {
        Ok(created) => HttpResponse::Created().json(created),
        Err(e) => {
            eprintln!("create error: {e}");
            let error_body = json!({"error": "We failed to create the Persoana Fizica Entity. Please review the details", "details": e.to_string()});
            HttpResponse::InternalServerError().json(error_body)
        }
    }
}

/// PUT /persoana-fizica/{id} — fully replaces an existing record.
#[put("/{id}")]
pub async fn update_persoana_fizica(
    req: HttpRequest,
    repo: web::Data<DynPersoanaFizicaRepository>,
    path: web::Path<Uuid>,
    body: web::Json<PersoanaFizicaRequest>,
) -> impl Responder {
    let user = match require_role(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(u) => u,
        Err(resp) => return resp,
    };

    if let Err(errors) = body.validate() {
        return HttpResponse::UnprocessableEntity().body(errors.to_string());
    }

    let id = path.into_inner();

    if user.claims().role == UserRole::Taxpayer {
        if user.claims().persoana_fizica_id != Some(id) {
            return HttpResponse::Forbidden().json(json!({
                "error": "Access denied — you can only update your own record"
            }));
        }
    }

    let not_found_error = json!({"error": format!("PersoanaFizica with id {id} not found")});

    let existing = match repo.find_by_id(id).await {
        Ok(Some(p)) => p,
        Ok(None) => return HttpResponse::NotFound().json(not_found_error),
        Err(e) => {
            eprintln!("update find_by_id error: {e}");
            let error_body = json!({
                "error": format!("We couldn't retrieve Persoana Fizica with id: {}, it doesn't exist in our database", id),
                "details": e.to_string()
            });
            return HttpResponse::InternalServerError().json(error_body);
        }
    };

    let persoana = PersoanaFizica::update_from_request(&existing, &body);

    match repo.update(id, persoana).await {
        Ok(p) => HttpResponse::Ok().json(p),
        Err(e) => {
            eprintln!("update error: {e}");
            let error_body = json!({"error": format!("We failed to update the Persoana Fizica entity with id {}, please review the details for more information", id), "details": e.to_string()});
            HttpResponse::InternalServerError().json(error_body)
        }
    }
}

/// DELETE /persoana-fizica/{id} — removes a record.
#[delete("/{id}")]
pub async fn delete_persoana_fizica(
    req: HttpRequest,
    repo: web::Data<DynPersoanaFizicaRepository>,
    path: web::Path<Uuid>,
) -> impl Responder {
    if let Err(resp) = require_role(&req, &[UserRole::Admin]) {
        return resp;
    }

    let id = path.into_inner();

    let success_body =
        json!({"success": format!("The entity with id {} was successfully deleted", id)});
    let not_found_error_body =
        json!({"error": format!("There is no entity with the id {} inside our database.", id)});

    match repo.delete(id).await {
        Ok(true) => HttpResponse::NoContent().json(success_body),
        Ok(false) => HttpResponse::NotFound().json(not_found_error_body),
        Err(e) => {
            eprintln!("delete error: {e}");
            let error_body = json!({"error": format!("We failed delete the entity with id {}, please check the details for more information", id), "details": e.to_string()});
            HttpResponse::InternalServerError().json(error_body)
        }
    }
}
