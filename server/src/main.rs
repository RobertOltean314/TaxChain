use crate::handlers::persoana_fizica_handlers::*;
use actix_web::{App, HttpResponse, HttpServer, Responder, get, web};

pub mod handlers;
pub mod models;
pub mod services;
pub mod validators;

#[get("/")]
async fn hello() -> impl Responder {
    HttpResponse::Ok().body("Hello World")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| App::new().service(web::scope("/app").service(persoana_fizica_handler)))
        .bind(("127.0.0.1", 8080))?
        .run()
        .await
}
