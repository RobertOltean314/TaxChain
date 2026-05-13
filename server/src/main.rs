mod startup;

use std::sync::Arc;

use reqwest::Client;
use startup::{AppConfig, AppState, run};
use taxchain::{
    blockchain::anchor::AnchorService,
    handlers::auth_handlers::AuthConfig,
    services::{
        audit_service::PgAuditRepository, bnr_service::BnrService,
        e_factura_service::PgEFacturaRepository, entity_service::PgEntityRepository,
        invoice_service::PgInvoiceRepository, partner_service::PgPartnerRepository,
        persoana_fizica_service::PgPersoanaFizicaRepository,
        persoana_juridica_service::PgPersoanaJuridicaRepository, proof_service::ProofRepository,
        report_service::ReportService, user_service::PgUserRepository,
    },
    utils::io_error,
    zk::ZkService,
};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();

    let config = AppConfig::from_env()?;

    //  Database
    let pool = sqlx::PgPool::connect(&config.database_url)
        .await
        .map_err(|e| io_error(&format!("Failed to connect to the database: {e}")))?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|e| io_error(&format!("Migration failed: {e}")))?;

    sqlx::query("TRUNCATE TABLE curs_valutar")
        .execute(&pool)
        .await
        .map_err(|e| io_error(&format!("Failed to clear BNR rate cache: {e}")))?;

    // HTTP clients
    let http_client = Client::new();

    // BNR's SSL certificate is occasionally expired; force HTTP/1.1 because BNR's
    // server sends TCP RST in response to HTTP/2 ALPN negotiation from Docker.
    let bnr_http_client = Client::builder()
        .danger_accept_invalid_certs(true)
        .http1_only()
        .user_agent("Mozilla/5.0 (compatible; TaxChain/1.0)")
        .build()
        .map_err(|e| io_error(&format!("Failed to build BNR HTTP client: {e}")))?;

    //  App state
    let state = AppState {
        pool: pool.clone(),
        auth_config: AuthConfig {
            jwt_secret: config.jwt_secret,
            access_token_ttl: config.access_token_ttl,
            refresh_token_ttl_days: config.refresh_token_ttl_days,
            google_client_id: config.google_client_id,
        },
        http_client,
        pf_repo: Arc::new(PgPersoanaFizicaRepository::new(pool.clone())),
        pj_repo: Arc::new(PgPersoanaJuridicaRepository::new(pool.clone())),
        user_repo: Arc::new(PgUserRepository::new(pool.clone())),
        partener_repo: Arc::new(PgPartnerRepository::new(pool.clone())),
        invoice_repo: Arc::new(PgInvoiceRepository::new(pool.clone())),
        efactura_repo: Arc::new(PgEFacturaRepository::new(pool.clone())),
        entity_repo: Arc::new(PgEntityRepository::new(pool.clone())),
        bnr_service: Arc::new(BnrService::new(pool.clone(), bnr_http_client)),
        report_service: Arc::new(ReportService::new(pool.clone())),
        audit_repo: Arc::new(PgAuditRepository::new(pool.clone())),
        proof_repo: Arc::new(ProofRepository::new(pool.clone())),
        zk_service: Arc::new(
            ZkService::load_or_generate()
                .map_err(|e| io_error(&format!("Failed to initialize ZK service: {e}")))?,
        ),
        anchor_service: Arc::new(
            AnchorService::new(&config.sepolia_rpc_url, &config.invoice_registry_address)
                .map_err(|e| io_error(&format!("Failed to init AnchorService: {e}")))?,
        ),
    };

    run(state).await
}
