use std::sync::Arc;

use actix_cors::Cors;
use actix_web::http::header;
use actix_web::{App, HttpServer, web};
use reqwest::Client;
use taxchain::{
    auth::middleware::JwtAuthMiddleware,
    handlers::{
        auth_handlers::{
            AuthConfig, google_login_handler, link_entity_handler, logout, refresh_token_handler,
            wallet_nonce_handler, wallet_verify_handler,
        },
        bnr_handlers::get_bnr_rate,
        report_handlers::get_vat_summary,
        create_persoana_fizica, create_persoana_juridica, delete_persoana_fizica,
        delete_persoana_juridica,
        efactura_handlers::{
            generate_invoice_xml, get_efactura_by_cif, get_efactura_status, submit_efactura,
        },
        entity_handlers::{add_entity, list_my_entities, remove_entity},
        find_all_persoana_fizica, find_all_persoana_juridica, get_persoana_fizica_by_id,
        invoice_handlers::{
            create_invoice, delete_invoice, find_all_invoices, get_invoice_by_id,
            get_next_invoice_number, update_invoice, update_invoice_payment, update_invoice_status,
        },
        partner_handlers::{
            create_partener, delete_partener, find_all_partener, get_partener_by_id,
            update_partener,
        },
        persoana_juridica_handlers::get_persoana_juridica_by_id,
        update_persoana_fizica, update_persoana_juridica,
    },
    services::{
        bnr_service::{BnrService, DynBnrService},
        report_service::{DynReportService, ReportService},
        e_factura_service::{DynEFacturaRepository, PgEFacturaRepository},
        entity_service::{DynEntityRepository, PgEntityRepository},
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

    // Ensure the invoice transaction type enum and column exist for older databases.
    // Use compatibility-safe SQL instead of `CREATE TYPE IF NOT EXISTS`.
    sqlx::query(
        r#"
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'tip_tranzactie'
            ) THEN
                CREATE TYPE tip_tranzactie AS ENUM ('Venit', 'Cheltuiala');
            END IF;
        END$$;
        "#,
    )
    .execute(&pool)
    .await
    .map_err(|e| io_error(&format!("Failed to create tip_tranzactie type: {e}")))?;

    sqlx::query(
        r#"
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'factura'
                  AND column_name = 'tip_tranzactie'
            ) THEN
                ALTER TABLE factura
                ADD COLUMN tip_tranzactie tip_tranzactie;
            END IF;
        END$$;
        "#,
    )
    .execute(&pool)
    .await
    .map_err(|e| io_error(&format!("Failed to add tip_tranzactie column: {e}")))?;

    // Clear the BNR rate cache so any rates stored with the old buggy parser
    // (which divided non-multiplier currencies by 100) are discarded and
    // re-fetched correctly on the next request. The table is purely a cache
    // so truncating it on startup is safe.
    sqlx::query("TRUNCATE TABLE curs_valutar")
        .execute(&pool)
        .await
        .map_err(|e| io_error(&format!("Failed to clear BNR rate cache: {e}")))?;

    let http_client = Client::new();

    // BNR's SSL certificate is occasionally expired; use a dedicated client
    // that skips verification only for this service.
    let bnr_http_client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| io_error(&format!("Failed to build BNR HTTP client: {e}")))?;

    let pf_repo: DynPersoanaFizicaRepository =
        Arc::new(PgPersoanaFizicaRepository::new(pool.clone()));
    let pj_repo: DynPersoanaJuridicaRepository =
        Arc::new(PgPersoanaJuridicaRepository::new(pool.clone()));
    let user_repo: DynUserRepository = Arc::new(PgUserRepository::new(pool.clone()));
    let partener_repo: DynPartnerRepository = Arc::new(PgPartnerRepository::new(pool.clone()));
    let invoice_repo: DynInvoiceRepository = Arc::new(PgInvoiceRepository::new(pool.clone()));
    let efactura_repo: DynEFacturaRepository = Arc::new(PgEFacturaRepository::new(pool.clone()));
    let entity_repo: DynEntityRepository = Arc::new(PgEntityRepository::new(pool.clone()));
    let bnr_service: DynBnrService =
        Arc::new(BnrService::new(pool.clone(), bnr_http_client));
    let report_service: DynReportService = Arc::new(ReportService::new(pool.clone()));

    let auth_config = AuthConfig {
        jwt_secret,
        access_token_ttl,
        refresh_token_ttl_days,
        google_client_id,
    };

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:5173") // Vite dev server
            .allowed_methods(vec!["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                header::AUTHORIZATION,
                header::CONTENT_TYPE,
                header::HeaderName::from_static("x-entity-type"),
                header::HeaderName::from_static("x-entity-id"),
            ])
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
            .app_data(web::Data::new(efactura_repo.clone()))
            .app_data(web::Data::new(entity_repo.clone()))
            .app_data(web::Data::new(bnr_service.clone()))
            .app_data(web::Data::new(report_service.clone()))
            // ── Auth (public) ──────────────────────────────────────────────
            .service(
                web::scope("/auth")
                    .service(google_login_handler)
                    .service(wallet_nonce_handler)
                    .service(wallet_verify_handler)
                    .service(refresh_token_handler)
                    .service(logout)
                    // JWT-protected: user must be logged in to link an entity
                    .service(
                        web::scope("")
                            .wrap(JwtAuthMiddleware)
                            .service(link_entity_handler),
                    ),
            )
            // ── Persoana Fizica ────────────────────────────────────────────
            .service(
                web::scope("/persoana-fizica")
                    .wrap(JwtAuthMiddleware)
                    .service(find_all_persoana_fizica)
                    .service(get_persoana_fizica_by_id)
                    .service(create_persoana_fizica)
                    .service(update_persoana_fizica)
                    .service(delete_persoana_fizica),
            )
            // ── Persoana Juridica ──────────────────────────────────────────
            .service(
                web::scope("/persoana-juridica")
                    .wrap(JwtAuthMiddleware)
                    .service(find_all_persoana_juridica)
                    .service(get_persoana_juridica_by_id)
                    .service(create_persoana_juridica)
                    .service(update_persoana_juridica)
                    .service(delete_persoana_juridica),
            )
            // ── Partener (Romanian spelling — consistent with DB table name)
            .service(
                web::scope("/partener")
                    .wrap(JwtAuthMiddleware)
                    .service(find_all_partener)
                    .service(get_partener_by_id)
                    .service(create_partener)
                    .service(update_partener)
                    .service(delete_partener),
            )
            // ── Factura ────────────────────────────────────────────────────
            .service(
                web::scope("/factura")
                    .wrap(JwtAuthMiddleware)
                    .service(get_next_invoice_number) // GET /factura/next-number — must be before /{id}
                    .service(find_all_invoices)
                    .service(get_invoice_by_id)
                    .service(create_invoice)
                    .service(update_invoice)
                    .service(update_invoice_status)
                    .service(update_invoice_payment)
                    .service(delete_invoice),
            )
            // ── eFactura (ANAF mock) ───────────────────────────────────────
            .service(
                web::scope("/efactura")
                    .wrap(JwtAuthMiddleware)
                    .service(submit_efactura)
                    .service(get_efactura_status)
                    .service(get_efactura_by_cif)
                    .service(generate_invoice_xml),
            )
            // ── Entitate (accountant → managed entities) ───────────────────
            .service(
                web::scope("/entitate")
                    .wrap(JwtAuthMiddleware)
                    .service(list_my_entities)
                    .service(add_entity)
                    .service(remove_entity),
            )
            // ── Curs BNR (public — no auth needed) ────────────────────────
            .service(web::scope("/curs-bnr").service(get_bnr_rate))
            // ── Reports (JWT-protected) ────────────────────────────────────
            .service(
                web::scope("/reports")
                    .wrap(JwtAuthMiddleware)
                    .service(get_vat_summary),
            )
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
