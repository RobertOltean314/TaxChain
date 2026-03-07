use actix_web::{App, HttpServer, web};
use taxchain::{
    handlers::{persoana_fizica_handler, persoana_juridica_handler},
    hello,
};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .service(hello)
            .service(web::scope("/persoana-fizica").service(persoana_fizica_handler))
            .service(web::scope("/persoana-juridica").service(persoana_juridica_handler))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
