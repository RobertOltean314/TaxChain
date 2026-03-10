pub mod handlers;
pub mod models;
pub mod services;
pub mod validators;

use actix_web::{HttpResponse, Responder, get};

#[get("/")]
pub async fn hello() -> impl Responder {
    HttpResponse::Ok().body("Hello World")
}
