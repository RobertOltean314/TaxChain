use crate::services::persoana_fizica_service;
use actix_web::{HttpResponse, Responder, get};

#[get("/persoana-fizica")]
pub async fn persoana_fizica_handler() -> impl Responder {
    let persoana_fizica_data = persoana_fizica_service::find_all();
    HttpResponse::Ok().body("Fine!")
}
