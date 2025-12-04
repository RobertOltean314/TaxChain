mod handlers;
mod helpers;
mod models;
mod repository;
mod routes;
mod services;

use std::env;

use actix_web::{App, HttpServer, web};

use crate::repository::database_connection::create_pool;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();

    let pool = create_pool().await;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    let port = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT must have a valid number");
    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());

    println!("Starting Entity Management Service...");
    println!("Server running at http://{}:{}", host, port);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .service(web::scope("/api").service(routes::persoana_fizica_routes()))
    })
    .bind(("127.0.0.1", port))?
    .run()
    .await
}
