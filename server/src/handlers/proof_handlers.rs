use actix_web::{HttpRequest, HttpResponse, Responder, get, post, web};
use chrono::{NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{
    auth::middleware::require_role,
    blockchain::anchor::DynAnchorService,
    models::{UserRole, entity_model::EntityContext},
    services::{
        bnr_service::DynBnrService,
        persoana_fizica_service::DynPersoanaFizicaRepository,
        persoana_juridica_service::DynPersoanaJuridicaRepository,
        proof_service::DynProofRepository,
        report_service::DynReportService,
        user_service::DynUserRepository,
    },
    zk::DynZkService,
};

// ── Romanian fiscal constants 2025 ────────────────────────────────────────────

/// CAS base ceiling: 24 × salariu minim gross = 97,200 RON
const CAS_BASE_MAX: Decimal = Decimal::from_parts(97200, 0, 0, false, 0);
/// CASS base ceiling: 60 × salariu minim = 243,000 RON
const CASS_BASE_MAX: Decimal = Decimal::from_parts(243000, 0, 0, false, 0);

// ── Helpers ───────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct GenerateProofBody {
    pub from: String,
    pub to: String,
}

#[derive(Deserialize)]
pub struct AuditorQuery {
    pub fiscal_code: Option<String>,
    pub entity_type: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
}

fn extract_entity(req: &HttpRequest) -> Result<EntityContext, HttpResponse> {
    let entity_type = req
        .headers()
        .get("X-Entity-Type")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_uppercase())
        .filter(|s| s == "PF" || s == "PJ")
        .ok_or_else(|| {
            HttpResponse::BadRequest()
                .json(json!({"error": "Missing or invalid X-Entity-Type header"}))
        })?;

    let entity_id = req
        .headers()
        .get("X-Entity-Id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| {
            HttpResponse::BadRequest()
                .json(json!({"error": "Missing or invalid X-Entity-Id header"}))
        })?;

    Ok(EntityContext { entity_type, entity_id })
}

fn compute_proof_hash(
    entity_type: &str,
    entity_id: Uuid,
    period_from: NaiveDate,
    period_to: NaiveDate,
    vat_colectat: Decimal,
    vat_deductibil: Decimal,
    vat_net: Decimal,
    venituri_brute: Decimal,
    cheltuieli_brute: Decimal,
    total_obligatii: Decimal,
) -> [u8; 32] {
    let canonical = serde_json::json!({
        "entity_type":     entity_type,
        "entity_id":       entity_id.to_string(),
        "period_from":     period_from.to_string(),
        "period_to":       period_to.to_string(),
        "vat_colectat":    vat_colectat.to_string(),
        "vat_deductibil":  vat_deductibil.to_string(),
        "vat_net":         vat_net.to_string(),
        "venituri_brute":  venituri_brute.to_string(),
        "cheltuieli_brute": cheltuieli_brute.to_string(),
        "total_obligatii": total_obligatii.to_string(),
        "statement":       "Declar ca am achitat obligatiile fiscale pentru perioada indicata."
    });
    let mut h = Sha256::new();
    h.update(canonical.to_string().as_bytes());
    h.finalize().into()
}

fn compute_period_hash(entity_id: Uuid, period_from: NaiveDate, period_to: NaiveDate) -> [u8; 32] {
    let mut h = Sha256::new();
    h.update(format!("{entity_id}:{period_from}:{period_to}").as_bytes());
    h.finalize().into()
}

fn hex(bytes: [u8; 32]) -> String {
    format!("0x{}", bytes.iter().map(|b| format!("{b:02x}")).collect::<String>())
}

/// Tax computation for PFA (Persoana Fizica Autorizata).
/// Returns (cas, cass, impozit_venit, total_obligatii).
fn compute_pf_taxes(
    venituri_brute: Decimal,
    cheltuieli_brute: Decimal,
    vat_net: Decimal,
) -> (Decimal, Decimal, Decimal, Decimal) {
    let rate25 = Decimal::new(25, 2);
    let rate10 = Decimal::new(10, 2);

    let net_income = (venituri_brute - cheltuieli_brute).max(Decimal::ZERO);
    let cas_base = net_income.min(CAS_BASE_MAX);
    let cass_base = net_income.min(CASS_BASE_MAX);
    let cas = cas_base * rate25;
    let cass = cass_base * rate10;
    let impozit_venit = (net_income - cas - cass).max(Decimal::ZERO) * rate10;
    let total_obligatii = cas + cass + impozit_venit + vat_net.max(Decimal::ZERO);
    (cas, cass, impozit_venit, total_obligatii)
}

/// Tax computation for SRL (Societate cu Raspundere Limitata).
/// Returns (impozit_profit, total_obligatii).
fn compute_pj_taxes(
    venituri_brute: Decimal,
    cheltuieli_brute: Decimal,
    vat_net: Decimal,
    eur_rate: Decimal,
) -> (Decimal, Decimal) {
    let micro_threshold = Decimal::new(500_000, 0) * eur_rate;
    let is_micro = venituri_brute <= micro_threshold;
    let profit = (venituri_brute - cheltuieli_brute).max(Decimal::ZERO);
    let tax_rate = if is_micro { Decimal::new(3, 2) } else { Decimal::new(16, 2) };
    let tax_base = if is_micro { venituri_brute } else { profit };
    let impozit_profit = tax_base * tax_rate;
    let total_obligatii = impozit_profit + vat_net.max(Decimal::ZERO);
    (impozit_profit, total_obligatii)
}

/// Fetch entity name + fiscal code for proof denormalization.
async fn resolve_entity_info(
    entity_type: &str,
    entity_id: Uuid,
    pf_repo: &DynPersoanaFizicaRepository,
    pj_repo: &DynPersoanaJuridicaRepository,
) -> (String, String) {
    if entity_type == "PF" {
        if let Ok(Some(pf)) = pf_repo.find_by_id(entity_id).await {
            return (pf.prenume + " " + &pf.nume, pf.cnp);
        }
    } else if let Ok(Some(pj)) = pj_repo.find_by_id(entity_id).await {
        return (pj.denumire, pj.cod_fiscal);
    }
    ("Unknown".to_string(), "".to_string())
}

/// Scale a Decimal (RON) to u64 cents for the ZK circuit (multiply by 100, truncate).
fn to_scaled_u64(d: Decimal) -> u64 {
    let scaled = (d.abs() * Decimal::new(100, 0)).floor();
    // Convert via string to avoid needing ToPrimitive feature
    scaled.to_string().parse::<u64>().unwrap_or(0)
}

// ── Shared proof creation logic ───────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
async fn run_plain_proof(
    user_id: Uuid,
    ctx: &EntityContext,
    entity_name: &str,
    entity_fiscal_code: &str,
    from: NaiveDate,
    to: NaiveDate,
    vat_colectat: Decimal,
    vat_deductibil: Decimal,
    venituri_brute: Decimal,
    cheltuieli_brute: Decimal,
    eur_rate: Decimal,
    private_key: &str,
    anchor_service: &DynAnchorService,
    proof_repo: &DynProofRepository,
) -> Result<(crate::models::proof_model::FiscalProof, String), HttpResponse> {
    let vat_net = vat_colectat - vat_deductibil;
    // Tax base must exclude VAT — VAT is a pass-through, not income
    let venituri_nete = venituri_brute - vat_colectat;
    let cheltuieli_nete = cheltuieli_brute - vat_deductibil;

    let (cas, cass, impozit_venit, impozit_profit, total_obligatii) = if ctx.entity_type == "PF" {
        let (cas, cass, iv, total) = compute_pf_taxes(venituri_nete, cheltuieli_nete, vat_net);
        (cas, cass, iv, Decimal::ZERO, total)
    } else {
        let (ip, total) = compute_pj_taxes(venituri_nete, cheltuieli_nete, vat_net, eur_rate);
        (Decimal::ZERO, Decimal::ZERO, Decimal::ZERO, ip, total)
    };

    let proof_bytes = compute_proof_hash(
        &ctx.entity_type,
        ctx.entity_id,
        from,
        to,
        vat_colectat,
        vat_deductibil,
        vat_net,
        venituri_brute,
        cheltuieli_brute,
        total_obligatii,
    );
    let period_bytes = compute_period_hash(ctx.entity_id, from, to);
    let proof_hash_hex = hex(proof_bytes);
    let period_hash_hex = hex(period_bytes);

    let (tx_hash, block_number) =
        match anchor_service.anchor_proof(proof_bytes, period_bytes, private_key).await {
            Ok(pair) => pair,
            Err(e) => {
                eprintln!("proof: Sepolia call failed: {e}");
                return Err(HttpResponse::InternalServerError()
                    .json(json!({"error": "Blockchain anchoring failed", "details": e.to_string()})));
            }
        };

    let proof = match proof_repo
        .create(
            user_id,
            &ctx.entity_type,
            ctx.entity_id,
            entity_name,
            entity_fiscal_code,
            from,
            to,
            vat_colectat,
            vat_deductibil,
            vat_net,
            venituri_brute,
            cheltuieli_brute,
            cas,
            cass,
            impozit_venit,
            impozit_profit,
            total_obligatii,
            &proof_hash_hex,
            &period_hash_hex,
            &tx_hash,
            block_number,
            false,
            None,
        )
        .await
    {
        Ok(p) => p,
        Err(e) => {
            eprintln!("proof: DB insert failed after successful anchor — tx={tx_hash}: {e}");
            return Err(HttpResponse::Ok().json(json!({
                "tx_hash": tx_hash,
                "block_number": block_number,
                "etherscan_url": format!("https://sepolia.etherscan.io/tx/{tx_hash}"),
                "warning": "Proof anchored on-chain but DB record failed to save."
            })));
        }
    };

    let etherscan_url = format!("https://sepolia.etherscan.io/tx/{tx_hash}");
    Ok((proof, etherscan_url))
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// `POST /reports/proof`
///
/// Plain SHA-256 commitment proof. Computes all tax obligations from paid invoices,
/// anchors the canonical hash on Sepolia, and stores the result.
#[post("/proof")]
pub async fn generate_proof(
    req: HttpRequest,
    body: web::Json<GenerateProofBody>,
    report_svc: web::Data<DynReportService>,
    bnr_svc: web::Data<DynBnrService>,
    anchor_service: web::Data<DynAnchorService>,
    proof_repo: web::Data<DynProofRepository>,
    pf_repo: web::Data<DynPersoanaFizicaRepository>,
    pj_repo: web::Data<DynPersoanaJuridicaRepository>,
) -> impl Responder {
    let auth_user = match require_role(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(u) => u,
        Err(r) => return r,
    };
    let user_id = match auth_user.claims().user_id() {
        Ok(id) => id,
        Err(_) => return HttpResponse::InternalServerError()
            .json(json!({"error": "Invalid user ID in token"})),
    };
    let ctx = match extract_entity(&req) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let (from, to) = match parse_dates(&body.from, &body.to) {
        Ok(d) => d,
        Err(r) => return r,
    };

    let today = Utc::now().date_naive();
    let (vat_colectat, vat_deductibil, venituri_brute, cheltuieli_brute, eur_rate) =
        match aggregate_vat(&report_svc, &bnr_svc, &ctx, from, to, today).await {
            Ok(v) => v,
            Err(r) => return r,
        };

    let private_key = match std::env::var("PLATFORM_SIGNER_KEY") {
        Ok(k) if !k.is_empty() => k,
        _ => return HttpResponse::InternalServerError()
            .json(json!({"error": "PLATFORM_SIGNER_KEY not configured"})),
    };

    let (entity_name, entity_fiscal_code) =
        resolve_entity_info(&ctx.entity_type, ctx.entity_id, &pf_repo, &pj_repo).await;

    match run_plain_proof(
        user_id,
        &ctx,
        &entity_name,
        &entity_fiscal_code,
        from,
        to,
        vat_colectat,
        vat_deductibil,
        venituri_brute,
        cheltuieli_brute,
        eur_rate,
        &private_key,
        &anchor_service,
        &proof_repo,
    )
    .await
    {
        Ok((proof, etherscan_url)) => HttpResponse::Ok().json(json!({
            "proof": proof,
            "etherscan_url": etherscan_url
        })),
        Err(r) => r,
    }
}

/// `POST /reports/proof/zk`
///
/// Groth16 ZK proof. Proves VAT totals are correctly derived from private per-invoice
/// amounts without revealing individual invoice values. Anchors proof hash on Sepolia.
#[post("/proof/zk")]
pub async fn generate_zk_proof(
    req: HttpRequest,
    body: web::Json<GenerateProofBody>,
    report_svc: web::Data<DynReportService>,
    bnr_svc: web::Data<DynBnrService>,
    anchor_service: web::Data<DynAnchorService>,
    proof_repo: web::Data<DynProofRepository>,
    pf_repo: web::Data<DynPersoanaFizicaRepository>,
    pj_repo: web::Data<DynPersoanaJuridicaRepository>,
    zk_svc: web::Data<DynZkService>,
    user_repo: web::Data<DynUserRepository>,
) -> impl Responder {
    let auth_user = match require_role(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(u) => u,
        Err(r) => return r,
    };
    let user_id = match auth_user.claims().user_id() {
        Ok(id) => id,
        Err(_) => return HttpResponse::InternalServerError()
            .json(json!({"error": "Invalid user ID in token"})),
    };
    let ctx = match extract_entity(&req) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let (from, to) = match parse_dates(&body.from, &body.to) {
        Ok(d) => d,
        Err(r) => return r,
    };

    let today = Utc::now().date_naive();
    let (vat_colectat, vat_deductibil, venituri_brute, cheltuieli_brute, eur_rate) =
        match aggregate_vat(&report_svc, &bnr_svc, &ctx, from, to, today).await {
            Ok(v) => v,
            Err(r) => return r,
        };

    // ── Build per-invoice arrays for ZK circuit ───────────────────────────────
    let invoice_rows = match report_svc
        .invoice_amounts_for_zk(&ctx.entity_type, ctx.entity_id, from, to)
        .await
    {
        Ok(rows) => rows,
        Err(e) => {
            eprintln!("zk proof: failed to get invoice amounts: {e}");
            return HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to aggregate invoice data for ZK circuit"}));
        }
    };

    if invoice_rows.len() > crate::zk::circuit::MAX_INVOICES {
        return HttpResponse::BadRequest().json(json!({
            "error": format!(
                "Too many invoices for ZK proof: {} > {} max",
                invoice_rows.len(),
                crate::zk::circuit::MAX_INVOICES
            )
        }));
    }

    // Convert each invoice to RON and split into circuit arrays
    let mut income_bases: Vec<u64> = Vec::new();
    let mut income_vats: Vec<u64> = Vec::new();
    let mut expense_bases: Vec<u64> = Vec::new();
    let mut expense_vats: Vec<u64> = Vec::new();

    for row in &invoice_rows {
        let rate = if row.currency == "RON" {
            Decimal::ONE
        } else {
            bnr_svc.get_rate(&row.currency, today).await.unwrap_or(Decimal::ONE)
        };
        let base_ron = row.base * rate;
        let vat_ron = row.vat * rate;

        if row.tip_tranzactie == "Venit" {
            income_bases.push(to_scaled_u64(base_ron));
            income_vats.push(to_scaled_u64(vat_ron));
        } else {
            expense_bases.push(to_scaled_u64(base_ron));
            expense_vats.push(to_scaled_u64(vat_ron));
        }
    }

    let venituri_scaled = to_scaled_u64(venituri_brute);
    let cheltuieli_scaled = to_scaled_u64(cheltuieli_brute);
    let vat_col_scaled = to_scaled_u64(vat_colectat);
    let vat_ded_scaled = to_scaled_u64(vat_deductibil);

    // ── Generate Groth16 proof ────────────────────────────────────────────────
    let zk_bytes = match zk_svc.generate_proof(
        income_bases,
        income_vats,
        expense_bases,
        expense_vats,
        venituri_scaled,
        cheltuieli_scaled,
        vat_col_scaled,
        vat_ded_scaled,
    ) {
        Ok(b) => b,
        Err(e) => {
            eprintln!("zk proof: Groth16 generation failed: {e}");
            return HttpResponse::InternalServerError()
                .json(json!({"error": "ZK proof generation failed", "details": e.to_string()}));
        }
    };

    // ── Compute SHA-256 of the ZK proof bytes (this is what goes on-chain) ───
    let mut h = Sha256::new();
    h.update(&zk_bytes);
    let proof_hash_bytes: [u8; 32] = h.finalize().into();
    let period_bytes = compute_period_hash(ctx.entity_id, from, to);
    let proof_hash_hex = hex(proof_hash_bytes);
    let period_hash_hex = hex(period_bytes);

    // Use the user's own custodial wallet key (Google users) so the on-chain
    // transaction appears from their assigned address, not a shared platform key.
    // SIWE users have no server-side key — fall back to PLATFORM_SIGNER_KEY.
    let user = match user_repo.find_by_id(user_id).await {
        Ok(Some(u)) => u,
        Ok(None) => return HttpResponse::InternalServerError()
            .json(json!({"error": "User not found"})),
        Err(e) => {
            eprintln!("zk proof: failed to fetch user: {e}");
            return HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to fetch user data"}));
        }
    };
    let private_key = match user.assigned_wallet_key_enc.as_deref() {
        Some(enc) => match crate::wallet::encryption::decrypt_private_key(enc, None) {
            Ok(k) => k,
            Err(e) => {
                eprintln!("zk proof: failed to decrypt wallet key: {e}");
                return HttpResponse::InternalServerError()
                    .json(json!({"error": "Failed to decrypt user wallet key"}));
            }
        },
        None => match std::env::var("PLATFORM_SIGNER_KEY") {
            Ok(k) if !k.is_empty() => k,
            _ => return HttpResponse::InternalServerError()
                .json(json!({"error": "PLATFORM_SIGNER_KEY not configured for SIWE user"})),
        },
    };

    let (tx_hash, block_number) =
        match anchor_service.anchor_proof(proof_hash_bytes, period_bytes, &private_key).await {
            Ok(pair) => pair,
            Err(e) => {
                eprintln!("zk proof: Sepolia call failed: {e}");
                return HttpResponse::InternalServerError()
                    .json(json!({"error": "Blockchain anchoring failed", "details": e.to_string()}));
            }
        };

    let vat_net = vat_colectat - vat_deductibil;
    // Tax base must exclude VAT — VAT is a pass-through, not income
    let venituri_nete = venituri_brute - vat_colectat;
    let cheltuieli_nete = cheltuieli_brute - vat_deductibil;
    let (entity_name, entity_fiscal_code) =
        resolve_entity_info(&ctx.entity_type, ctx.entity_id, &pf_repo, &pj_repo).await;

    let (cas, cass, impozit_venit, impozit_profit, total_obligatii) = if ctx.entity_type == "PF" {
        let (cas, cass, iv, total) = compute_pf_taxes(venituri_nete, cheltuieli_nete, vat_net);
        (cas, cass, iv, Decimal::ZERO, total)
    } else {
        let (ip, total) = compute_pj_taxes(venituri_nete, cheltuieli_nete, vat_net, eur_rate);
        (Decimal::ZERO, Decimal::ZERO, Decimal::ZERO, ip, total)
    };

    let proof = match proof_repo
        .create(
            user_id,
            &ctx.entity_type,
            ctx.entity_id,
            &entity_name,
            &entity_fiscal_code,
            from,
            to,
            vat_colectat,
            vat_deductibil,
            vat_net,
            venituri_brute,
            cheltuieli_brute,
            cas,
            cass,
            impozit_venit,
            impozit_profit,
            total_obligatii,
            &proof_hash_hex,
            &period_hash_hex,
            &tx_hash,
            block_number,
            true,
            Some(zk_bytes),
        )
        .await
    {
        Ok(p) => p,
        Err(e) => {
            eprintln!("zk proof: DB insert failed after anchor — tx={tx_hash}: {e}");
            return HttpResponse::Ok().json(json!({
                "tx_hash": tx_hash,
                "block_number": block_number,
                "etherscan_url": format!("https://sepolia.etherscan.io/tx/{tx_hash}"),
                "warning": "ZK proof anchored on-chain but DB record failed to save."
            }));
        }
    };

    HttpResponse::Ok().json(json!({
        "proof": proof,
        "etherscan_url": format!("https://sepolia.etherscan.io/tx/{tx_hash}")
    }))
}

/// `GET /reports/proof/{id}/verify`
///
/// Re-runs Groth16 verification on a stored ZK proof. Returns valid/invalid.
#[get("/proof/{id}/verify")]
pub async fn verify_proof(
    req: HttpRequest,
    path: web::Path<Uuid>,
    proof_repo: web::Data<DynProofRepository>,
    zk_svc: web::Data<DynZkService>,
) -> impl Responder {
    if let Err(r) = require_role(&req, &[UserRole::Admin, UserRole::Taxpayer, UserRole::Auditor]) {
        return r;
    }

    let proof_id = path.into_inner();
    let result = match proof_repo.get_with_zk_bytes(proof_id).await {
        Ok(Some(r)) => r,
        Ok(None) => return HttpResponse::NotFound().json(json!({"error": "Proof not found"})),
        Err(e) => {
            eprintln!("verify_proof DB error: {e}");
            return HttpResponse::InternalServerError()
                .json(json!({"error": "DB error fetching proof"}));
        }
    };

    let (proof, zk_bytes) = result;

    if !proof.is_zk {
        return HttpResponse::BadRequest()
            .json(json!({"error": "This proof is not a ZK proof — use on-chain hash verification instead"}));
    }

    let Some(bytes) = zk_bytes else {
        return HttpResponse::InternalServerError()
            .json(json!({"error": "ZK proof bytes not stored"}));
    };

    let venituri_scaled = to_scaled_u64(proof.venituri_brute);
    let cheltuieli_scaled = to_scaled_u64(proof.cheltuieli_brute);
    let vat_col_scaled = to_scaled_u64(proof.vat_colectat);
    let vat_ded_scaled = to_scaled_u64(proof.vat_deductibil);

    match zk_svc.verify_proof(&bytes, venituri_scaled, cheltuieli_scaled, vat_col_scaled, vat_ded_scaled) {
        Ok(valid) => HttpResponse::Ok().json(json!({
            "proof_id": proof_id,
            "valid": valid,
            "verified_at": Utc::now().to_rfc3339(),
            "public_inputs": {
                "venituri_brute":    proof.venituri_brute,
                "cheltuieli_brute":  proof.cheltuieli_brute,
                "vat_colectat":      proof.vat_colectat,
                "vat_deductibil":    proof.vat_deductibil,
            }
        })),
        Err(e) => HttpResponse::InternalServerError()
            .json(json!({"error": "ZK verification error", "details": e.to_string()})),
    }
}

/// `GET /reports/proofs`
///
/// Returns all fiscal proofs for the active entity, most recent first.
#[get("/proofs")]
pub async fn list_proofs(
    req: HttpRequest,
    proof_repo: web::Data<DynProofRepository>,
) -> impl Responder {
    if let Err(r) = require_role(&req, &[UserRole::Admin, UserRole::Taxpayer, UserRole::Auditor]) {
        return r;
    }
    let ctx = match extract_entity(&req) {
        Ok(c) => c,
        Err(r) => return r,
    };
    match proof_repo.list_for_entity(&ctx.entity_type, ctx.entity_id).await {
        Ok(proofs) => HttpResponse::Ok().json(proofs),
        Err(e) => {
            eprintln!("list_proofs error: {e}");
            HttpResponse::InternalServerError().json(json!({"error": "Failed to fetch proofs"}))
        }
    }
}

/// `GET /profil/{fiscal_code}`
///
/// Public endpoint (no auth). Returns all proofs for an entity identified by
/// fiscal code (CIF for PJ, CNP for PF). Used for the public compliance profile.
#[get("/profil/{fiscal_code}")]
pub async fn public_profile(
    path: web::Path<String>,
    proof_repo: web::Data<DynProofRepository>,
) -> impl Responder {
    let fiscal_code = path.into_inner();
    match proof_repo.list_for_fiscal_code(&fiscal_code).await {
        Ok(proofs) => {
            if proofs.is_empty() {
                return HttpResponse::NotFound()
                    .json(json!({"error": "No proofs found for this fiscal code"}));
            }
            let entity_name = &proofs[0].entity_name;
            let entity_type = &proofs[0].entity_type;
            HttpResponse::Ok().json(json!({
                "entity_name": entity_name,
                "entity_fiscal_code": fiscal_code,
                "entity_type": entity_type,
                "proofs": proofs
            }))
        }
        Err(e) => {
            eprintln!("public_profile error: {e}");
            HttpResponse::InternalServerError().json(json!({"error": "Failed to fetch profile"}))
        }
    }
}

/// `GET /reports/proofs/all`
///
/// ANAF-style auditor view: all proofs in the system, optionally filtered.
/// Restricted to Admin and Auditor roles — no entity-scoping applied.
#[get("/proofs/all")]
pub async fn list_all_proofs(
    req: HttpRequest,
    query: web::Query<AuditorQuery>,
    proof_repo: web::Data<DynProofRepository>,
) -> impl Responder {
    if let Err(r) = require_role(&req, &[UserRole::Admin, UserRole::Auditor]) {
        return r;
    }

    let from = query.from.as_deref().and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
    let to = query.to.as_deref().and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

    match proof_repo
        .list_all(
            query.fiscal_code.as_deref(),
            query.entity_type.as_deref(),
            from,
            to,
        )
        .await
    {
        Ok(proofs) => HttpResponse::Ok().json(proofs),
        Err(e) => {
            eprintln!("list_all_proofs error: {e}");
            HttpResponse::InternalServerError().json(json!({"error": "Failed to fetch proofs"}))
        }
    }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

fn parse_dates(
    from: &str,
    to: &str,
) -> Result<(NaiveDate, NaiveDate), HttpResponse> {
    let from = NaiveDate::parse_from_str(from, "%Y-%m-%d").map_err(|_| {
        HttpResponse::BadRequest().json(json!({"error": "Invalid 'from' date. Use YYYY-MM-DD"}))
    })?;
    let to = NaiveDate::parse_from_str(to, "%Y-%m-%d").map_err(|_| {
        HttpResponse::BadRequest().json(json!({"error": "Invalid 'to' date. Use YYYY-MM-DD"}))
    })?;
    if from > to {
        return Err(HttpResponse::BadRequest()
            .json(json!({"error": "'from' must be before or equal to 'to'"})));
    }
    Ok((from, to))
}

/// Aggregate VAT totals (BNR-converted to RON) + EUR rate.
async fn aggregate_vat(
    report_svc: &DynReportService,
    bnr_svc: &DynBnrService,
    ctx: &EntityContext,
    from: NaiveDate,
    to: NaiveDate,
    today: NaiveDate,
) -> Result<(Decimal, Decimal, Decimal, Decimal, Decimal), HttpResponse> {
    let currency_totals = match report_svc
        .vat_totals_by_currency(&ctx.entity_type, ctx.entity_id, from, to)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            eprintln!("proof: failed to compute VAT totals: {e}");
            return Err(HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to aggregate VAT data"})));
        }
    };

    let eur_rate = bnr_svc.get_rate("EUR", today).await.unwrap_or(Decimal::new(5, 0));
    let mut vat_colectat = Decimal::ZERO;
    let mut vat_deductibil = Decimal::ZERO;
    let mut venituri_brute = Decimal::ZERO;
    let mut cheltuieli_brute = Decimal::ZERO;

    for row in &currency_totals {
        let rate = if row.currency == "RON" {
            Decimal::ONE
        } else {
            bnr_svc.get_rate(&row.currency, today).await.unwrap_or(Decimal::ONE)
        };
        vat_colectat += row.income_vat * rate;
        vat_deductibil += row.expense_vat * rate;
        venituri_brute += (row.income_base + row.income_vat) * rate;
        cheltuieli_brute += (row.expense_base + row.expense_vat) * rate;
    }

    Ok((vat_colectat, vat_deductibil, venituri_brute, cheltuieli_brute, eur_rate))
}
