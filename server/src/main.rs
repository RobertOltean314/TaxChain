use actix_web::{App, HttpServer, web};
use taxchain::{
    handlers::{
        create_persoana_fizica, delete_persoana_fizica, get_persoana_fizica_by_id,
        persoana_fizica_handler, persoana_juridica_handler, update_persoana_fizica,
    },
    hello,
    services::persoana_fizica_service,
};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let pf_store = web::Data::new(persoana_fizica_service::create_store());

    HttpServer::new(move || {
        App::new()
            .app_data(pf_store.clone())
            .service(hello)
            .service(
                web::scope("/persoana-fizica")
                    .service(persoana_fizica_handler)
                    .service(get_persoana_fizica_by_id)
                    .service(create_persoana_fizica)
                    .service(update_persoana_fizica)
                    .service(delete_persoana_fizica),
            )
            .service(web::scope("/persoana-juridica").service(persoana_juridica_handler))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}

