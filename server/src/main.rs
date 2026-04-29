use std::sync::Arc;

use actix_cors::Cors;
use actix_web::http::header;
use actix_web::{App, HttpServer, web};
use reqwest::Client;
use taxchain::{
    auth::middleware::JwtAuthMiddleware,
    blockchain::anchor::{AnchorService, DynAnchorService},
    handlers::{
        anchor_handlers::anchor_invoice_handler,
        audit_handlers::get_audit_log,
        auth_handlers::{
            AuthConfig, google_login_handler, link_entity_handler, logout, refresh_token_handler,
            wallet_nonce_handler, wallet_verify_handler,
        },
        bnr_handlers::get_bnr_rate,
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
        proof_handlers::{
            generate_proof, generate_zk_proof, list_all_proofs, list_proofs, public_profile,
            verify_proof,
        },
        public_handlers::list_public_entities,
        report_handlers::get_vat_summary,
        update_persoana_fizica, update_persoana_juridica,
    },
    services::{
        audit_service::{DynAuditRepository, PgAuditRepository},
        bnr_service::{BnrService, DynBnrService},
        e_factura_service::{DynEFacturaRepository, PgEFacturaRepository},
        entity_service::{DynEntityRepository, PgEntityRepository},
        invoice_service::{DynInvoiceRepository, PgInvoiceRepository},
        partner_service::{DynPartnerRepository, PgPartnerRepository},
        persoana_fizica_service::{DynPersoanaFizicaRepository, PgPersoanaFizicaRepository},
        persoana_juridica_service::{DynPersoanaJuridicaRepository, PgPersoanaJuridicaRepository},
        proof_service::{DynProofRepository, ProofRepository},
        report_service::{DynReportService, ReportService},
        user_service::{DynUserRepository, PgUserRepository},
    },
    utils::{io_error, require_env},
    zk::{DynZkService, ZkService},
};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();

    let database_url = require_env("DATABASE_URL")?;
    let jwt_secret = require_env("JWT_SECRET")?;
    let google_client_id = require_env("GOOGLE_CLIENT_ID")?;
    let sepolia_rpc_url = require_env("SEPOLIA_RPC_URL")?;
    let invoice_registry_address = require_env("INVOICE_REGISTRY_ADDRESS")?;

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

    // Create the fiscal proofs table if it does not yet exist (migration 08).
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS dovada_fiscala (
            id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id          UUID         NOT NULL REFERENCES users(id),
            entity_type      VARCHAR(2)   NOT NULL CHECK (entity_type IN ('PF', 'PJ')),
            entity_id        UUID         NOT NULL,
            period_from      DATE         NOT NULL,
            period_to        DATE         NOT NULL,
            vat_colectat     NUMERIC(14,2) NOT NULL DEFAULT 0,
            vat_deductibil   NUMERIC(14,2) NOT NULL DEFAULT 0,
            vat_net          NUMERIC(14,2) NOT NULL DEFAULT 0,
            venituri_brute   NUMERIC(14,2) NOT NULL DEFAULT 0,
            cheltuieli_brute NUMERIC(14,2) NOT NULL DEFAULT 0,
            proof_hash       VARCHAR(66)  NOT NULL,
            period_hash      VARCHAR(66)  NOT NULL,
            tx_hash          VARCHAR(66)  NOT NULL,
            block_number     BIGINT       NOT NULL,
            anchored_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await
    .map_err(|e| io_error(&format!("Failed to create dovada_fiscala table: {e}")))?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_dovada_fiscala_entity ON dovada_fiscala (entity_type, entity_id, period_from)",
    )
    .execute(&pool)
    .await
    .map_err(|e| io_error(&format!("Failed to create dovada_fiscala index: {e}")))?;

    // Also ensure blockchain columns exist on factura (migration 07 for older DBs).
    for col in &[
        ("tx_hash", "VARCHAR(66)"),
        ("block_number", "BIGINT"),
        ("anchored_at", "TIMESTAMPTZ"),
    ] {
        let sql = format!(
            r#"
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = 'factura'
                      AND column_name = '{}'
                ) THEN
                    ALTER TABLE factura ADD COLUMN {} {};
                END IF;
            END$$
            "#,
            col.0, col.0, col.1
        );
        sqlx::query(&sql)
            .execute(&pool)
            .await
            .map_err(|e| io_error(&format!("Failed to add {} to factura: {e}", col.0)))?;
    }

    // ── Migration 09: extend dovada_fiscala with tax + ZK columns ────────────
    for (col, col_type) in &[
        ("impozit_venit", "NUMERIC(14,2) NOT NULL DEFAULT 0"),
        ("cas", "NUMERIC(14,2) NOT NULL DEFAULT 0"),
        ("cass", "NUMERIC(14,2) NOT NULL DEFAULT 0"),
        ("impozit_profit", "NUMERIC(14,2) NOT NULL DEFAULT 0"),
        ("total_obligatii", "NUMERIC(14,2) NOT NULL DEFAULT 0"),
        ("is_zk", "BOOLEAN NOT NULL DEFAULT false"),
        ("zk_proof_bytes", "BYTEA"),
        ("entity_name", "VARCHAR(200) NOT NULL DEFAULT ''"),
        ("entity_fiscal_code", "VARCHAR(20) NOT NULL DEFAULT ''"),
    ] {
        let sql = format!(
            r#"
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = 'dovada_fiscala'
                      AND column_name = '{}'
                ) THEN
                    ALTER TABLE dovada_fiscala ADD COLUMN {} {};
                END IF;
            END$$
            "#,
            col, col, col_type
        );
        sqlx::query(&sql)
            .execute(&pool)
            .await
            .map_err(|e| io_error(&format!("Failed to add {} to dovada_fiscala: {e}", col)))?;
    }
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_dovada_fiscala_fiscal_code ON dovada_fiscala (entity_fiscal_code)"
    )
    .execute(&pool)
    .await
    .map_err(|e| io_error(&format!("Failed to create fiscal_code index: {e}")))?;

    // ── Migration 10: fix invoice unique constraints ──────────────────────────
    // The original NULLS NOT DISTINCT constraints treated all NULL issuer IDs
    // as equal, blocking the second invoice from any PJ issuer (emitent_pf_id
    // is NULL for PJ invoices). Replace with partial unique indexes.
    sqlx::query("ALTER TABLE factura DROP CONSTRAINT IF EXISTS chk_unique_numar_per_emitent_pf")
        .execute(&pool)
        .await
        .map_err(|e| {
            io_error(&format!(
                "Failed to drop constraint chk_unique_numar_per_emitent_pf: {e}"
            ))
        })?;

    sqlx::query("ALTER TABLE factura DROP CONSTRAINT IF EXISTS chk_unique_numar_per_emitent_pj")
        .execute(&pool)
        .await
        .map_err(|e| {
            io_error(&format!(
                "Failed to drop constraint chk_unique_numar_per_emitent_pj: {e}"
            ))
        })?;

    sqlx::query(
        r#"
        CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_numar_per_emitent_pf
            ON factura (numar, emitent_pf_id)
            WHERE emitent_pf_id IS NOT NULL;
        "#,
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        io_error(&format!(
            "Failed to create idx_unique_numar_per_emitent_pf: {e}"
        ))
    })?;

    sqlx::query(
        r#"
        CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_numar_per_emitent_pj
            ON factura (numar, emitent_pj_id)
            WHERE emitent_pj_id IS NOT NULL;
        "#,
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        io_error(&format!(
            "Failed to create idx_unique_numar_per_emitent_pj: {e}"
        ))
    })?;

    // ── Migration 11: audit trail ────────────────────────────────────────────
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS audit_log (
            id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            action          VARCHAR(64)  NOT NULL,
            actor_user_id   UUID         NOT NULL REFERENCES users(id),
            entity_type     VARCHAR(2),
            entity_id       UUID,
            resource_type   VARCHAR(32)  NOT NULL,
            resource_id     UUID,
            payload         TEXT         NOT NULL DEFAULT '{}',
            created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await
    .map_err(|e| io_error(&format!("Failed to create audit_log table: {e}")))?;

    for idx_sql in &[
        "CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id)",
        "CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log (resource_type, resource_id)",
        "CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log (actor_user_id)",
    ] {
        sqlx::query(idx_sql)
            .execute(&pool)
            .await
            .map_err(|e| io_error(&format!("Failed to create audit_log index: {e}")))?;
    }

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
    let bnr_service: DynBnrService = Arc::new(BnrService::new(pool.clone(), bnr_http_client));
    let report_service: DynReportService = Arc::new(ReportService::new(pool.clone()));
    let audit_repo: DynAuditRepository = Arc::new(PgAuditRepository::new(pool.clone()));
    let proof_repo: DynProofRepository = Arc::new(ProofRepository::new(pool.clone()));
    let zk_service: DynZkService = Arc::new(
        ZkService::load_or_generate()
            .map_err(|e| io_error(&format!("Failed to initialize ZK service: {e}")))?,
    );
    let anchor_service: DynAnchorService = Arc::new(
        AnchorService::new(&sepolia_rpc_url, &invoice_registry_address)
            .map_err(|e| io_error(&format!("Failed to init AnchorService: {e}")))?,
    );
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
            .app_data(web::Data::new(pool.clone()))
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
            .app_data(web::Data::new(proof_repo.clone()))
            .app_data(web::Data::new(zk_service.clone()))
            .app_data(web::Data::new(anchor_service.clone()))
            .app_data(web::Data::new(audit_repo.clone()))
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
                    .service(anchor_invoice_handler)
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
                    .service(get_vat_summary)
                    .service(generate_proof)
                    .service(generate_zk_proof)
                    .service(list_proofs)
                    .service(list_all_proofs)
                    .service(verify_proof),
            )
            // ── Audit trail (Auditor + Admin) ─────────────────────────────
            .service(
                web::scope("/jurnal-audit")
                    .wrap(JwtAuthMiddleware)
                    .service(get_audit_log),
            )
            // ── Public entity profiles & search (no auth) ─────────────────
            .service(public_profile)
            .service(list_public_entities)
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
