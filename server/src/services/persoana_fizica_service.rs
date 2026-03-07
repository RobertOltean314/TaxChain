use actix_web::{HttpResponse, Responder};

pub fn find_all() -> impl Responder {
    HttpResponse::Ok().body("Works fine!")
}
