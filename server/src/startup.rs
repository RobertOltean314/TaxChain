use actix_cors::Cors;
use actix_web::{App, HttpServer, http::header, web};
use reqwest::Client;
use taxchain::{
    auth::middleware::JwtAuthMiddleware,
    blockchain::anchor::DynAnchorService,
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
        persoana_fizica_handlers::erase_persoana_fizica_date,
        persoana_juridica_handlers::erase_persoana_juridica_date,
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
        audit_service::DynAuditRepository, bnr_service::DynBnrService,
        e_factura_service::DynEFacturaRepository, entity_service::DynEntityRepository,
        invoice_service::DynInvoiceRepository, partner_service::DynPartnerRepository,
        persoana_fizica_service::DynPersoanaFizicaRepository,
        persoana_juridica_service::DynPersoanaJuridicaRepository,
        proof_service::DynProofRepository, report_service::DynReportService,
        user_service::DynUserRepository,
    },
    utils::require_env,
    zk::DynZkService,
};

// ── Config ─────────────────────────────────────────────────────────────────

pub struct AppConfig {
    pub database_url: String,
    pub jwt_secret: String,
    pub google_client_id: String,
    pub sepolia_rpc_url: String,
    pub invoice_registry_address: String,
    pub access_token_ttl: i64,
    pub refresh_token_ttl_days: i64,
}

impl AppConfig {
    pub fn from_env() -> std::io::Result<Self> {
        Ok(Self {
            database_url: require_env("DATABASE_URL")?,
            jwt_secret: require_env("JWT_SECRET")?,
            google_client_id: require_env("GOOGLE_CLIENT_ID")?,
            sepolia_rpc_url: require_env("SEPOLIA_RPC_URL")?,
            invoice_registry_address: require_env("INVOICE_REGISTRY_ADDRESS")?,
            access_token_ttl: 3600,
            refresh_token_ttl_days: 30,
        })
    }
}

// ── App state ──────────────────────────────────────────────────────────────

pub struct AppState {
    pub pool: sqlx::PgPool,
    pub auth_config: AuthConfig,
    pub http_client: Client,
    pub pf_repo: DynPersoanaFizicaRepository,
    pub pj_repo: DynPersoanaJuridicaRepository,
    pub user_repo: DynUserRepository,
    pub partener_repo: DynPartnerRepository,
    pub invoice_repo: DynInvoiceRepository,
    pub efactura_repo: DynEFacturaRepository,
    pub entity_repo: DynEntityRepository,
    pub bnr_service: DynBnrService,
    pub report_service: DynReportService,
    pub audit_repo: DynAuditRepository,
    pub proof_repo: DynProofRepository,
    pub zk_service: DynZkService,
    pub anchor_service: DynAnchorService,
}

// ── Server ─────────────────────────────────────────────────────────────────

pub async fn run(state: AppState) -> std::io::Result<()> {
    HttpServer::new(move || {
        App::new()
            .wrap(build_cors())
            .app_data(web::Data::new(state.pool.clone()))
            .app_data(web::Data::new(state.pf_repo.clone()))
            .app_data(web::Data::new(state.pj_repo.clone()))
            .app_data(web::Data::new(state.user_repo.clone()))
            .app_data(web::Data::new(state.auth_config.clone()))
            .app_data(web::Data::new(state.http_client.clone()))
            .app_data(web::Data::new(state.partener_repo.clone()))
            .app_data(web::Data::new(state.invoice_repo.clone()))
            .app_data(web::Data::new(state.efactura_repo.clone()))
            .app_data(web::Data::new(state.entity_repo.clone()))
            .app_data(web::Data::new(state.bnr_service.clone()))
            .app_data(web::Data::new(state.report_service.clone()))
            .app_data(web::Data::new(state.proof_repo.clone()))
            .app_data(web::Data::new(state.zk_service.clone()))
            .app_data(web::Data::new(state.anchor_service.clone()))
            .app_data(web::Data::new(state.audit_repo.clone()))
            .configure(configure_routes)
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}

// ── CORS ───────────────────────────────────────────────────────────────────

fn build_cors() -> Cors {
    Cors::default()
        .allowed_origin("http://localhost:5173")
        .allowed_methods(vec!["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
        .allowed_headers(vec![
            header::AUTHORIZATION,
            header::CONTENT_TYPE,
            header::HeaderName::from_static("x-entity-type"),
            header::HeaderName::from_static("x-entity-id"),
        ])
        .max_age(3600)
}

// ── Routes ─────────────────────────────────────────────────────────────────

fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg
        // ── Auth (public) ──────────────────────────────────────────────
        .service(
            web::scope("/auth")
                .service(google_login_handler)
                .service(wallet_nonce_handler)
                .service(wallet_verify_handler)
                .service(refresh_token_handler)
                .service(logout)
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
                .service(erase_persoana_fizica_date)  // must be before /{id}
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
                .service(erase_persoana_juridica_date)  // must be before /{id}
                .service(find_all_persoana_juridica)
                .service(get_persoana_juridica_by_id)
                .service(create_persoana_juridica)
                .service(update_persoana_juridica)
                .service(delete_persoana_juridica),
        )
        // ── Partener ──────────────────────────────────────────────────
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
                .service(get_next_invoice_number) // must be before /{id}
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
        // ── Entitate ──────────────────────────────────────────────────
        .service(
            web::scope("/entitate")
                .wrap(JwtAuthMiddleware)
                .service(list_my_entities)
                .service(add_entity)
                .service(remove_entity),
        )
        // ── Curs BNR (public) ──────────────────────────────────────────
        .service(web::scope("/curs-bnr").service(get_bnr_rate))
        // ── Reports ────────────────────────────────────────────────────
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
        // ── Audit trail ────────────────────────────────────────────────
        .service(
            web::scope("/jurnal-audit")
                .wrap(JwtAuthMiddleware)
                .service(get_audit_log),
        )
        // ── Public (no auth) ───────────────────────────────────────────
        .service(public_profile)
        .service(list_public_entities);
}
