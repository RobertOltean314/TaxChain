use crate::{
    models::{PersoanaJuridica, PersoanaJuridicaRequest},
    services::persoana_juridica_service::DynPersoanaJuridicaRepository,
};
use actix_web::{HttpResponse, Responder, delete, get, post, put, web};
use serde_json::json;
use uuid::Uuid;
use validator::Validate;

#[get("")]
pub async fn find_all_persoana_juridica(
    repo: web::Data<DynPersoanaJuridicaRepository>,
) -> impl Responder {
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
    repo: web::Data<DynPersoanaJuridicaRepository>,
    path: web::Path<Uuid>,
) -> impl Responder {
    let id = path.into_inner();
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
    repo: web::Data<DynPersoanaJuridicaRepository>,
    body: web::Json<PersoanaJuridicaRequest>,
) -> impl Responder {
    if let Err(errors) = body.validate() {
        return HttpResponse::BadRequest().body(errors.to_string());
    }

    let persoana = PersoanaJuridica::from_request(body.into_inner());

    match repo.create(persoana).await {
        Ok(created) => HttpResponse::Created().json(created),
        Err(e) => {
            let error_body = json!({"error": "We failed to create the Persoana Juridica Entity. Please review the details", "details": e.to_string()});
            HttpResponse::InternalServerError().json(error_body)
        }
    }
}

#[put("/{id}")]
pub async fn update_persoana_juridica(
    repo: web::Data<DynPersoanaJuridicaRepository>,
    path: web::Path<Uuid>,
    body: web::Json<PersoanaJuridicaRequest>,
) -> impl Responder {
    if let Err(errors) = body.validate() {
        return HttpResponse::BadRequest().body(errors.to_string());
    }
    let id = path.into_inner();
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

#[delete("/{id}")]
pub async fn delete_persoana_juridica(
    repo: web::Data<DynPersoanaJuridicaRepository>,
    path: web::Path<Uuid>,
) -> impl Responder {
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
