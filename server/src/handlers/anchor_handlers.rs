use actix_web::{HttpRequest, HttpResponse, Responder, post, web};
use serde::Serialize;
use serde_json::json;
use uuid::Uuid;

use crate::{
    auth::middleware::require_role,
    blockchain::anchor::{AnchorError, AnchorService, DynAnchorService},
    models::UserRole,
    services::{invoice_service::DynInvoiceRepository, user_service::DynUserRepository},
    wallet::encryption::decrypt_private_key,
};

#[derive(Serialize)]
pub struct AnchorResponse {
    pub tx_hash: String,
    pub block_number: i64,
    pub etherscan_url: String,
}

/// `POST /factura/:id/anchor`
///
/// Computes the canonical SHA-256 hash of the invoice + its lines,
/// submits `anchorInvoice(hash)` to the InvoiceRegistry on Sepolia,
/// waits for one confirmation, then persists the tx_hash and block_number.
///
/// Only available for custodial (Google) users whose private key is stored
/// server-side. SIWE wallet users must anchor from the frontend (Phase 11).
#[post("/{id}/anchor")]
pub async fn anchor_invoice_handler(
    req: HttpRequest,
    path: web::Path<Uuid>,
    invoice_repo: web::Data<DynInvoiceRepository>,
    user_repo: web::Data<DynUserRepository>,
    anchor_service: web::Data<DynAnchorService>,
) -> impl Responder {
    let auth_user = match require_role(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(u) => u,
        Err(r) => return r,
    };

    let user_id = match auth_user.claims().user_id() {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(json!({"error": "Invalid user ID in token"}));
        }
    };

    let invoice_id = path.into_inner();

    // ── Fetch invoice ─────────────────────────────────────────────────────────
    let invoice = match invoice_repo.find_by_id(invoice_id).await {
        Ok(Some(inv)) => inv,
        Ok(None) => {
            return HttpResponse::NotFound().json(json!({"error": "Invoice not found"}));
        }
        Err(e) => {
            eprintln!("anchor: DB error fetching invoice: {e}");
            return HttpResponse::InternalServerError().json(json!({"error": "Database error"}));
        }
    };

    // Only anchor issued (non-draft) invoices
    if matches!(
        invoice.status,
        crate::models::InvoiceStatus::Draft | crate::models::InvoiceStatus::Cancelled
    ) {
        return HttpResponse::BadRequest().json(json!({
            "error": "Only Issued, Sent, or Paid invoices can be anchored"
        }));
    }

    // Already anchored — return existing data for the relevant transition
    let existing_tx = if invoice.status == crate::models::InvoiceStatus::Sent {
        invoice.sent_tx_hash.as_deref()
    } else {
        invoice.tx_hash.as_deref()
    };
    if let Some(tx) = existing_tx {
        let block = if invoice.status == crate::models::InvoiceStatus::Sent {
            invoice.sent_block_number.unwrap_or(0)
        } else {
            invoice.block_number.unwrap_or(0)
        };
        return HttpResponse::Ok().json(AnchorResponse {
            etherscan_url: etherscan_url(tx),
            tx_hash: tx.to_string(),
            block_number: block,
        });
    }

    // ── Fetch user to get encrypted private key ───────────────────────────────
    let user = match user_repo.find_by_id(user_id).await {
        Ok(Some(u)) => u,
        Ok(None) => {
            return HttpResponse::NotFound().json(json!({"error": "User not found"}));
        }
        Err(e) => {
            eprintln!("anchor: DB error fetching user: {e}");
            return HttpResponse::InternalServerError().json(json!({"error": "Database error"}));
        }
    };

    let enc_key = match user.assigned_wallet_key_enc {
        Some(k) => k,
        None => {
            return HttpResponse::BadRequest().json(json!({
                "error": "No custodial wallet found. SIWE wallet users must anchor from the frontend."
            }));
        }
    };

    let private_key = match decrypt_private_key(&enc_key, None) {
        Ok(k) => k,
        Err(e) => {
            eprintln!("anchor: failed to decrypt wallet key: {e}");
            return HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to decrypt wallet key"}));
        }
    };

    // ── Fetch lines ───────────────────────────────────────────────────────────
    let lines = match invoice_repo.find_lines(invoice_id).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("anchor: DB error fetching lines: {e}");
            return HttpResponse::InternalServerError().json(json!({"error": "Database error"}));
        }
    };

    // ── Compute hash (transition label must match the automatic anchoring) ─────
    let transition = if invoice.status == crate::models::InvoiceStatus::Sent { "sent" } else { "paid" };
    let hash = AnchorService::compute_invoice_hash(&invoice, &lines, transition);
    let (issuer, partner) = invoice_repo
        .get_anchor_parties(invoice_id).await
        .unwrap_or(None)
        .unwrap_or_else(|| ("Necunoscut".into(), "Necunoscut".into()));
    let memo = format!(
        "TaxChain | {} | {} | {} → {} | {}",
        invoice.number,
        if invoice.status == crate::models::InvoiceStatus::Sent { "Trimisa" } else { "Platita" },
        issuer,
        partner,
        chrono::Utc::now().format("%Y-%m-%d")
    );

    // ── Submit to Sepolia (blocks ~12–15s for one confirmation) ──────────────
    let (tx_hash, block_number) = match anchor_service.anchor_invoice(hash, &private_key, memo).await {
        Ok(pair) => pair,
        Err(AnchorError::Contract(msg)) if msg.contains("already anchored") => {
            return HttpResponse::Conflict().json(json!({
                "error": "Invoice already anchored on-chain by a different issuer"
            }));
        }
        Err(e) => {
            eprintln!("anchor: Sepolia call failed: {e}");
            return HttpResponse::InternalServerError()
                .json(json!({"error": "Blockchain anchoring failed", "details": e.to_string()}));
        }
    };

    // ── Persist to the right column ───────────────────────────────────────────
    let persist_result = if invoice.status == crate::models::InvoiceStatus::Sent {
        invoice_repo.update_sent_anchor_info(invoice_id, &tx_hash, block_number).await
    } else {
        invoice_repo.update_anchor_info(invoice_id, &tx_hash, block_number).await
    };
    match persist_result {
        Ok(_) => {}
        Err(e) => {
            eprintln!("anchor: DB update failed after successful anchor — tx_hash={tx_hash}: {e}");
            // Don't return an error — the tx was mined. Return success with the data.
        }
    }

    HttpResponse::Ok().json(AnchorResponse {
        etherscan_url: etherscan_url(&tx_hash),
        tx_hash,
        block_number,
    })
}

fn etherscan_url(tx_hash: &str) -> String {
    format!("https://sepolia.etherscan.io/tx/{tx_hash}")
}
