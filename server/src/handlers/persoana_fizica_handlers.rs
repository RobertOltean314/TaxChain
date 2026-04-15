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
/// Admin: can create for anyone.
/// Taxpayer: can create their own during onboarding (only if they don't have one yet).
#[post("")]
pub async fn create_persoana_fizica(
    req: HttpRequest,
    repo: web::Data<DynPersoanaFizicaRepository>,
    user_repo: web::Data<crate::services::user_service::DynUserRepository>,
    body: web::Json<PersoanaFizicaRequest>,
) -> impl Responder {
    let user = match require_role(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(u) => u,
        Err(resp) => return resp,
    };

    // Taxpayer can only create their own PersoanaFizica during onboarding
    if user.claims().role == UserRole::Taxpayer {
        if let Some(_) = user.claims().persoana_fizica_id {
            return HttpResponse::Forbidden().json(json!({
                "error": "You already have a PersoanaFizica record. Contact an administrator to modify it."
            }));
        }
    }

    if let Err(errors) = body.validate() {
        eprintln!("Validation errors: {:?}", errors);
        let error_messages: Vec<String> = errors
            .field_errors()
            .iter()
            .flat_map(|(field, errs)| {
                errs.iter().map(move |err| {
                    format!(
                        "{}: {}",
                        field,
                        err.message.as_deref().unwrap_or("validation failed")
                    )
                })
            })
            .collect();
        return HttpResponse::UnprocessableEntity().json(json!({
            "error": "Validation failed",
            "details": error_messages
        }));
    }

    let persoana = PersoanaFizica::from_request(body.into_inner());

    match repo.create(persoana.clone()).await {
        Ok(created) => {
            // If a Taxpayer created this, automatically link it to their account
            if user.claims().role == UserRole::Taxpayer {
                if let Ok(user_id) = Uuid::parse_str(&user.claims().sub) {
                    let _ = user_repo
                        .update_entity_links(
                            user_id,
                            Some(created.id),
                            user.claims().persoana_juridica_id, // Preserve existing juridica ID
                        )
                        .await;
                }
            }

            HttpResponse::Created().json(created)
        }
        Err(e) => {
            eprintln!("create error: {e}");

            // Convert database constraint violations to user-friendly validation errors.
            // The application already validates the phone format; this only maps DB constraint failures.
            let error_message = if e.to_string().contains("persoana_fizica_cnp_key") {
                "A person with this CNP already exists"
            } else if e.to_string().contains("persoana_fizica_telefon_check") {
                "Phone number format is invalid. Expected format: +407xxxxxxxx or 07xxxxxxxx"
            } else if e.to_string().contains("persoana_fizica_email_check") {
                "Email format is invalid"
            } else if e.to_string().contains("persoana_fizica_iban_key") {
                "This IBAN is already registered to another account"
            } else {
                "Failed to create PersoanaFizica. Please check your input data."
            };

            HttpResponse::UnprocessableEntity().json(json!({
                "error": "Validation failed",
                "details": [error_message]
            }))
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
