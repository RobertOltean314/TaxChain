mod handlers;
mod helpers;
mod models;
mod repository;
mod routes;
mod services;

use actix_web::{App, HttpServer, web};

use crate::repository::database_connection::create_pool;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let pool = create_pool().await;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    let host = "127.0.0.1";
    let port = 8080;

    println!("Starting Entity Management Service...");
    println!("Server running at http://{}:{}", host, port);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .service(web::scope("/api").service(routes::persoana_fizica_routes()))
    })
    .bind((host, port))?
    .run()
    .await
}
