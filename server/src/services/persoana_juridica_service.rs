use actix_web::{HttpResponse, Responder, get};

#[get("/find-all")]
pub async fn find_all() -> impl Responder {
    HttpResponse::Ok().body("Works fine! - PersoanaJuridica")
}
