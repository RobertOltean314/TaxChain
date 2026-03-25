use std::sync::Arc;

use actix_cors::Cors;
use actix_web::http::header;
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
        invoice_handlers::{
            create_invoice, delete_invoice, find_all_invoices, get_invoice_by_id, update_invoice,
            update_invoice_payment, update_invoice_status,
        },
        partner_handlers::{
            create_partener, delete_partener, find_all_partener, get_partener_by_id,
            update_partener,
        },
        persoana_juridica_handlers::get_persoana_juridica_by_id,
        update_persoana_fizica, update_persoana_juridica,
    },
    services::{
        invoice_service::{DynInvoiceRepository, PgInvoiceRepository},
        partner_service::{DynPartnerRepository, PgPartnerRepository},
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
    let partener_repo: DynPartnerRepository = Arc::new(PgPartnerRepository::new(pool.clone()));
    let invoice_repo: DynInvoiceRepository = Arc::new(PgInvoiceRepository::new(pool.clone()));

    let auth_config = AuthConfig {
        jwt_secret,
        access_token_ttl,
        refresh_token_ttl_days,
        google_client_id,
    };

    let http_client = Client::new();

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:5173") // Vite dev server
            .allowed_methods(vec!["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
            .allowed_headers(vec![header::AUTHORIZATION, header::CONTENT_TYPE])
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(pf_repo.clone()))
            .app_data(web::Data::new(pj_repo.clone()))
            .app_data(web::Data::new(user_repo.clone()))
            .app_data(web::Data::new(auth_config.clone()))
            .app_data(web::Data::new(http_client.clone()))
            .app_data(web::Data::new(partener_repo.clone()))
            .app_data(web::Data::new(invoice_repo.clone()))
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
                    .wrap(JwtAuthMiddleware)
                    .service(find_all_persoana_fizica)
                    .service(get_persoana_fizica_by_id)
                    .service(create_persoana_fizica)
                    .service(update_persoana_fizica)
                    .service(delete_persoana_fizica),
            )
            .service(
                web::scope("/persoana-juridica")
                    .wrap(JwtAuthMiddleware)
                    .service(find_all_persoana_juridica)
                    .service(get_persoana_juridica_by_id)
                    .service(create_persoana_juridica)
                    .service(update_persoana_juridica)
                    .service(delete_persoana_juridica),
            )
            .service(
                web::scope("/partener")
                    .wrap(JwtAuthMiddleware)
                    .service(find_all_partener)
                    .service(get_partener_by_id)
                    .service(create_partener)
                    .service(update_partener)
                    .service(delete_partener),
            )
            .service(
                web::scope("/invoice")
                    .wrap(JwtAuthMiddleware)
                    .service(find_all_invoices)
                    .service(get_invoice_by_id)
                    .service(create_invoice)
                    .service(update_invoice)
                    .service(update_invoice_status)
                    .service(update_invoice_payment)
                    .service(delete_invoice),
            )
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
