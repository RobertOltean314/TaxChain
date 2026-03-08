use crate::services::persoana_juridica_service::DynPersoanaJuridicaRepository;
use actix_web::{HttpResponse, Responder, get, web};
use serde_json::json;

#[get("")]
pub async fn find_all_persoana_juridica(
    repo: web::Data<DynPersoanaJuridicaRepository>,
) -> impl Responder {
    match repo.find_all().await {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(e) => {
            let error_body = json!({"error": "Failed to retrieve all Persoana Juridica entities", "details": e.to_string()});
            HttpResponse::InternalServerError().json(error_body)
        }
    }
}
