use std::sync::Arc;

use actix_web::{App, HttpServer, web};
use taxchain::{
    handlers::{
        create_persoana_fizica, delete_persoana_fizica, find_all_persoana_fizica,
        get_persoana_fizica_by_id, persoana_juridica_handler, update_persoana_fizica,
    },
    hello,
    services::persoana_fizica_service::{DynPersoanaFizicaRepository, PgPersoanaFizicaRepository},
};

//TODO: Implement proper HTTP Status Codes with body message when something unexpected happens. Each case should return the proper Status Code suggested by the HTTP Standard, for example, if a page doesn't exist we should return 404 Status code, if an endpoi has query parameters but they were not provided we should return 422 and so on

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").map_err(|e| {
        std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("DATABASE_URL environment variable must be set: {e}"),
        )
    })?;

    let pool = sqlx::PgPool::connect(&database_url).await.map_err(|e| {
        std::io::Error::new(
            std::io::ErrorKind::ConnectionRefused,
            format!("Failed to connect to the database: {e}"),
        )
    })?;

    let repo: DynPersoanaFizicaRepository = Arc::new(PgPersoanaFizicaRepository::new(pool));
    let repo_data = web::Data::new(repo);

    HttpServer::new(move || {
        App::new()
            .app_data(repo_data.clone())
            .service(hello)
            .service(
                web::scope("/persoana-fizica")
                    .service(find_all_persoana_fizica)
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
