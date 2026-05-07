use crate::{
    auth::middleware::require_role,
    models::{PersoanaJuridica, PersoanaJuridicaRequest, UserRole, audit_model::CreateAuditEntry},
    services::{
        audit_service::DynAuditRepository,
        persoana_juridica_service::DynPersoanaJuridicaRepository,
    },
};
use actix_web::{HttpRequest, HttpResponse, Responder, delete, get, post, put, web};
use serde_json::json;
use uuid::Uuid;
use validator::Validate;

#[get("")]
pub async fn find_all_persoana_juridica(
    req: HttpRequest,
    repo: web::Data<DynPersoanaJuridicaRepository>,
) -> impl Responder {
    if let Err(resp) = require_role(&req, &[UserRole::Admin, UserRole::Auditor, UserRole::Taxpayer]) {
        return resp;
    }

    match repo.find_all().await {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(e) => {
            eprintln!("find_all persoana_juridica error: {e}"); // ADD THIS
            let error_body = json!({"error": "Failed to retrieve all Persoana Juridica entities", "details": e.to_string()});
            HttpResponse::InternalServerError().json(error_body)
        }
    }
}

#[get("/{id}")]
pub async fn get_persoana_juridica_by_id(
    req: HttpRequest,
    repo: web::Data<DynPersoanaJuridicaRepository>,
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
        if user.claims().persoana_juridica_id != Some(id) {
            return HttpResponse::Forbidden().json(json!({
                "error": "Access denied — you can only view your own record"
            }));
        }
    }

    let not_found_error =
        json!({"error": format!("Persoana Juridica with id {} was not found", id)});
    match repo.find_by_id(id).await {
        Ok(Some(p)) => HttpResponse::Ok().json(p),
        Ok(None) => HttpResponse::NotFound().json(not_found_error),
        Err(e) => {
            let error_body = json!({
                "error": format!("We couldn't retrieve Persoana Juridica with id: {}, it doesn't exist in our database", id),
                "details": e.to_string()
            });
            HttpResponse::InternalServerError().json(error_body)
        }
    }
}

#[post("")]
pub async fn create_persoana_juridica(
    req: HttpRequest,
    repo: web::Data<DynPersoanaJuridicaRepository>,
    user_repo: web::Data<crate::services::user_service::DynUserRepository>,
    body: web::Json<PersoanaJuridicaRequest>,
) -> impl Responder {
    let user = match require_role(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(u) => u,
        Err(resp) => return resp,
    };

    // Taxpayer can only create their own PersoanaJuridica during onboarding
    if user.claims().role == UserRole::Taxpayer {
        if let Some(_) = user.claims().persoana_juridica_id {
            return HttpResponse::Forbidden().json(json!({
                "error": "You already have a PersoanaJuridica record. Contact an administrator to modify it."
            }));
        }
    }

    if let Err(errors) = body.validate() {
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

    let persoana = PersoanaJuridica::from_request(body.into_inner());

    match repo.create(persoana.clone()).await {
        Ok(created) => {
            // If a Taxpayer created this, automatically link it to their account
            if user.claims().role == UserRole::Taxpayer {
                if let Ok(user_id) = Uuid::parse_str(&user.claims().sub) {
                    let _ = user_repo
                        .update_entity_links(
                            user_id,
                            user.claims().persoana_fizica_id, // Preserve existing fizica ID
                            Some(created.id),
                        )
                        .await;
                }
            }

            HttpResponse::Created().json(created)
        }
        Err(e) => {
            eprintln!("create error: {e}");

            // Convert database constraint violations to user-friendly validation errors
            let error_message = if e.to_string().contains("persoana_juridica_cod_fiscal_key") {
                "A company with this fiscal code already exists"
            } else if e.to_string().contains("persoana_juridica_telefon_check") {
                "Phone number format is invalid. Expected format: +407xxxxxxxx or 07xxxxxxxx"
            } else if e.to_string().contains("persoana_juridica_email_check") {
                "Email format is invalid"
            } else if e.to_string().contains("persoana_juridica_iban_key") {
                "This IBAN is already registered to another account"
            } else {
                "Failed to create PersoanaJuridica. Please check your input data."
            };

            HttpResponse::UnprocessableEntity().json(json!({
                "error": "Validation failed",
                "details": [error_message]
            }))
        }
    }
}

#[put("/{id}")]
pub async fn update_persoana_juridica(
    req: HttpRequest,
    repo: web::Data<DynPersoanaJuridicaRepository>,
    path: web::Path<Uuid>,
    body: web::Json<PersoanaJuridicaRequest>,
) -> impl Responder {
    let user = match require_role(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(u) => u,
        Err(resp) => return resp,
    };

    if let Err(errors) = body.validate() {
        return HttpResponse::BadRequest().body(errors.to_string());
    }
    let id = path.into_inner();

    if user.claims().role == UserRole::Taxpayer {
        if user.claims().persoana_juridica_id != Some(id) {
            return HttpResponse::Forbidden().json(json!({
                "error": "Access denied — you can only update your own record"
            }));
        }
    }

    let not_found_error = json!({"error": format!("Persoana Juridica with id {id} not found")});

    let existing = match repo.find_by_id(id).await {
        Ok(Some(p)) => p,
        Ok(None) => return HttpResponse::NotFound().json(not_found_error),
        Err(e) => {
            eprintln!("update find_by_id error: {e}");
            let error_body = json!({
                "error": format!("We couldn't retrieve Persoana Juridica with id: {}, it doesn't exist in our database", id),
                "details": e.to_string()
            });
            return HttpResponse::InternalServerError().json(error_body);
        }
    };

    let persoana = PersoanaJuridica::update_from_request(&existing, &body);

    match repo.update(persoana).await {
        Ok(p) => HttpResponse::Ok().json(p),
        Err(e) => {
            eprintln!("update error: {e}");
            let error_body = json!({"error": format!("We failed to update the PersoanaJuridica entity with id {}, please review the details for more information", id), "details": e.to_string()});
            HttpResponse::InternalServerError().json(error_body)
        }
    }
}

/// POST /persoana-juridica/{id}/stergere-date — GDPR right-to-erasure (Admin only).
///
/// Nullifies IBAN, telefon and email for the legal entity. The record itself and the
/// fiscal code are kept — invoices and audit entries reference the entity UUID.
#[post("/{id}/stergere-date")]
pub async fn erase_persoana_juridica_date(
    req: HttpRequest,
    repo: web::Data<DynPersoanaJuridicaRepository>,
    audit_repo: web::Data<DynAuditRepository>,
    path: web::Path<Uuid>,
) -> impl Responder {
    let user = match require_role(&req, &[UserRole::Admin]) {
        Ok(u) => u,
        Err(resp) => return resp,
    };

    let id = path.into_inner();
    let user_id = match user.claims().user_id() {
        Ok(uid) => uid,
        Err(_) => return HttpResponse::InternalServerError().json(json!({"error": "Invalid JWT"})),
    };

    match repo.erase_personal_data(id).await {
        Ok(true) => {
            let audit = audit_repo.clone();
            actix_web::rt::spawn(async move {
                let _ = audit.log(CreateAuditEntry {
                    action: "pj.gdpr_erasure",
                    actor_user_id: user_id,
                    entity_type: Some("PJ".into()),
                    entity_id: Some(id),
                    resource_type: "persoana_juridica",
                    resource_id: Some(id),
                    payload: json!({ "gdpr_article": "17", "fields_erased": ["iban","telefon","email"] }),
                }).await;
            });
            HttpResponse::Ok().json(json!({
                "success": true,
                "message": "Datele de contact și bancare au fost șterse conform GDPR art. 17 (dreptul la ștergere)."
            }))
        }
        Ok(false) => HttpResponse::NotFound().json(json!({"error": format!("PersoanaJuridica {} not found", id)})),
        Err(e) => {
            eprintln!("erase_persoana_juridica_date error: {e}");
            HttpResponse::InternalServerError().json(json!({"error": "Eroare la ștergerea datelor personale", "details": e.to_string()}))
        }
    }
}

#[delete("/{id}")]
pub async fn delete_persoana_juridica(
    req: HttpRequest,
    repo: web::Data<DynPersoanaJuridicaRepository>,
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
