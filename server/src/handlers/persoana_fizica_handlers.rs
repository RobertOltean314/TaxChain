use actix_web::{HttpResponse, Responder, get};

#[get("")]
pub async fn persoana_fizica_handler() -> impl Responder {
    HttpResponse::Ok().body("Persoana Fizica - Fine!")
}
