use std::sync::Arc;

use actix_web::{App, HttpServer, web};
use reqwest::Client;
use taxchain::{
    auth::middleware::JwtAuthMiddleware,
    handlers::{
        auth_handlers::{
            AuthConfig, google_login_handler, logout, refresh_token_handler, wallet_nonce_handler,
            wallet_verify_handler,
        },
        create_persoana_fizica, create_persoana_juridica, delete_persoana_fizica,
        delete_persoana_juridica, find_all_persoana_fizica, find_all_persoana_juridica,
        get_persoana_fizica_by_id,
        persoana_juridica_handlers::get_persoana_juridica_by_id,
        update_persoana_fizica, update_persoana_juridica,
    },
    services::{
        persoana_fizica_service::{DynPersoanaFizicaRepository, PgPersoanaFizicaRepository},
        persoana_juridica_service::{DynPersoanaJuridicaRepository, PgPersoanaJuridicaRepository},
        user_service::{DynUserRepository, PgUserRepository},
    },
    utils::{io_error, require_env},
};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();

    let database_url = require_env("DATABASE_URL")?;
    let jwt_secret = require_env("JWT_SECRET")?;
    let google_client_id = require_env("GOOGLE_CLIENT_ID")?;

    let access_token_ttl: i64 = 3600;
    let refresh_token_ttl_days: i64 = 30;

    let pool = sqlx::PgPool::connect(&database_url)
        .await
        .map_err(|e| io_error(&format!("Failed to connect to the database: {e}")))?;

    let pf_repo: DynPersoanaFizicaRepository =
        Arc::new(PgPersoanaFizicaRepository::new(pool.clone()));

    let pj_repo: DynPersoanaJuridicaRepository =
        Arc::new(PgPersoanaJuridicaRepository::new(pool.clone()));

    let user_repo: DynUserRepository = Arc::new(PgUserRepository::new(pool.clone()));

    let auth_config = AuthConfig {
        jwt_secret,
        access_token_ttl,
        refresh_token_ttl_days,
        google_client_id,
    };

    let http_client = Client::new();

    HttpServer::new(move || {
        App::new()
            // -- Shared state --
            .app_data(web::Data::new(pf_repo.clone()))
            .app_data(web::Data::new(pj_repo.clone()))
            .app_data(web::Data::new(user_repo.clone()))
            .app_data(web::Data::new(auth_config.clone()))
            .app_data(web::Data::new(http_client.clone()))
            .service(
                web::scope("/auth")
                    .service(google_login_handler)
                    .service(wallet_nonce_handler)
                    .service(wallet_verify_handler)
                    .service(refresh_token_handler)
                    .service(logout),
            )
            .service(
                web::scope("/persoana-fizica")
                    // .wrap(JwtAuthMiddleware)   ← uncomment in Phase 3
                    .service(find_all_persoana_fizica)
                    .service(get_persoana_fizica_by_id)
                    .service(create_persoana_fizica)
                    .service(update_persoana_fizica)
                    .service(delete_persoana_fizica),
            )
            .service(
                web::scope("/persoana-juridica")
                    // .wrap(JwtAuthMiddleware)   ← uncomment in Phase 3
                    .service(find_all_persoana_juridica)
                    .service(get_persoana_juridica_by_id)
                    .service(create_persoana_juridica)
                    .service(update_persoana_juridica)
                    .service(delete_persoana_juridica),
            )
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
