mod handlers;
mod helpers;
mod middleware;
mod models;
mod openapi;
mod repository;
mod routes;
mod services;

use crate::repository::database_connection::create_pool;
use actix_cors::Cors;
use actix_web::{App, HttpResponse, HttpServer, web};
use std::env;
use utoipa::OpenApi;
use utoipa_scalar::{Scalar, Servable}; // ← needed for .with_url()

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    let pool = create_pool().await;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Migrations failed");

    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .unwrap();
    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());

    println!("Entity Management Service running");
    println!("   • API:        http://{}:{}/api/…", host, port);
    println!("   • Docs UI:    http://{}:{}/docs", host, port);
    println!(
        "   • OpenAPI:    http://{}:{}/api-docs/openapi.json",
        host, port
    );

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:4200")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                actix_web::http::header::AUTHORIZATION,
                actix_web::http::header::ACCEPT,
                actix_web::http::header::CONTENT_TYPE,
            ])
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(pool.clone()))
            .route(
                "/api-docs/openapi.json",
                web::get().to(|| async {
                    HttpResponse::Ok()
                        .content_type("application/json")
                        .body(openapi::ApiDoc::openapi().to_pretty_json().unwrap())
                }),
            )
            .service(Scalar::with_url("/docs", openapi::ApiDoc::openapi()))
            .service(
                web::scope("/api")
                    .service(routes::persoana_fizica_routes())
                    .service(routes::entity_routes()),
            )
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
