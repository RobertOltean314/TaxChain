use actix_web::{App, HttpResponse, HttpServer, Responder, get};

// TODO: Create tables for:
// [] Persoana Fizica
// [] Persoana Juridica
// TODO: Implement Data Structures for PersoanaFizica, PersoanaJuridica, PersoanaFizicaResponse and PersoanaJuridicaResponse to properlly match database schemas

#[get("/")]
async fn hello() -> impl Responder {
    HttpResponse::Ok().body("Hello World")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| App::new().service(hello))
        .bind(("127.0.0.1", 8080))?
        .run()
        .await
}
