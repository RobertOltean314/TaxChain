use actix_web::{HttpResponse, Responder, get};

#[get("")]
pub async fn persoana_juridica_handler() -> impl Responder {
    HttpResponse::Ok().body("Persoana Juridica - Fine!")
}
