use actix_web::{HttpResponse, Result, web};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::efactura_model::EFacturaStatus;
use crate::services::e_factura_service::DynEFacturaRepository;
use crate::services::invoice_service::DynInvoiceRepository;
use crate::services::partner_service::DynPartnerRepository;
use crate::services::persoana_fizica_service::DynPersoanaFizicaRepository;
use crate::services::persoana_juridica_service::DynPersoanaJuridicaRepository;
use crate::utils::{generate_ubl_xml, validate_ubl_xml};

// Request structure for submitting an invoice to ANAF
#[derive(Debug, Deserialize)]
pub struct SubmitEFacturaRequest {
    pub cif_emitent: String,
    pub xml: String,
}

// Response structure for eFactura submission
#[derive(Debug, Serialize)]
pub struct SubmitEFacturaResponse {
    pub message_id: Uuid,
    pub status: String,
    pub message: String,
}

// Mock ANAF processing - simulates UBL 2.1 validation
async fn process_anaf_mock(xml: &str) -> Result<(), String> {
    // Validate UBL 2.1 XML structure
    validate_ubl_xml(xml)?;

    // Simulate some processing time and random success/failure
    // In a real implementation, this would validate against ANAF schema and business rules
    // For now, we'll skip the delay to avoid tokio dependency

    // For demo purposes, randomly succeed or fail (90% success rate)
    use rand::Rng;
    let mut rng = rand::thread_rng();
    if rng.gen_bool(0.9) {
        Ok(())
    } else {
        Err(
            "ANAF validation failed: Invalid VAT calculation or missing mandatory fields"
                .to_string(),
        )
    }
}

/// Submit an invoice to ANAF eFactura system (mock)
#[actix_web::post("/efactura/submit")]
pub async fn submit_efactura(
    repo: web::Data<DynEFacturaRepository>,
    body: web::Json<SubmitEFacturaRequest>,
) -> Result<HttpResponse> {
    // Basic validation
    if body.cif_emitent.trim().is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "CIF emitent is required"
        })));
    }

    if body.xml.trim().is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "XML content is required"
        })));
    }

    // Submit to database initially as processing
    let message = match repo
        .submit_invoice(body.cif_emitent.clone(), body.xml.clone())
        .await
    {
        Ok(msg) => msg,
        Err(e) => {
            eprintln!("Failed to submit eFactura: {e}");
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to submit invoice to ANAF"
            })));
        }
    };

    // Process the mock ANAF validation asynchronously
    let repo_clone = repo.clone();
    let message_id = message.id;
    let xml_content = body.xml.clone();

    actix_web::rt::spawn(async move {
        let result = process_anaf_mock(&xml_content).await;

        let (status, error_message) = match result {
            Ok(_) => (EFacturaStatus::Ok, None),
            Err(e) => (EFacturaStatus::Error, Some(e)),
        };

        if let Err(e) = repo_clone
            .update_status(message_id, status, error_message)
            .await
        {
            eprintln!("Failed to update eFactura status: {e}");
        }
    });

    let response = SubmitEFacturaResponse {
        message_id: message.id,
        status: "processing".to_string(),
        message: "Invoice submitted to ANAF for processing".to_string(),
    };

    Ok(HttpResponse::Accepted().json(response))
}

/// Get eFactura message status by ID
#[actix_web::get("/efactura/{id}")]
pub async fn get_efactura_status(
    repo: web::Data<DynEFacturaRepository>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let id = path.into_inner();

    match repo.find_by_id(id).await {
        Ok(Some(message)) => Ok(HttpResponse::Ok().json(message)),
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "eFactura message not found"
        }))),
        Err(e) => {
            eprintln!("Failed to get eFactura status: {e}");
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to retrieve eFactura status"
            })))
        }
    }
}

/// Get all eFactura messages for a CIF
#[actix_web::get("/efactura/cif/{cif}")]
pub async fn get_efactura_by_cif(
    repo: web::Data<DynEFacturaRepository>,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let cif = path.into_inner();

    match repo.find_by_cif(&cif).await {
        Ok(messages) => Ok(HttpResponse::Ok().json(messages)),
        Err(e) => {
            eprintln!("Failed to get eFactura messages by CIF: {e}");
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to retrieve eFactura messages"
            })))
        }
    }
}

/// Generate UBL 2.1 XML for an invoice
#[actix_web::get("/efactura/generate/{invoice_id}")]
pub async fn generate_invoice_xml(
    invoice_repo: web::Data<DynInvoiceRepository>,
    pf_repo: web::Data<DynPersoanaFizicaRepository>,
    pj_repo: web::Data<DynPersoanaJuridicaRepository>,
    partner_repo: web::Data<DynPartnerRepository>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let invoice_id = path.into_inner();

    // Get the invoice
    let invoice = match invoice_repo.find_by_id(invoice_id).await {
        Ok(Some(inv)) => inv,
        Ok(None) => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Invoice not found"
            })));
        }
        Err(e) => {
            eprintln!("Failed to get invoice: {e}");
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to retrieve invoice"
            })));
        }
    };

    // Get issuer information
    let (issuer_cif, issuer_name) = if let Some(pf_id) = invoice.issuer_pf_id {
        match pf_repo.find_by_id(pf_id).await {
            Ok(Some(pf)) => (pf.cnp.clone(), format!("{} {}", pf.nume, pf.prenume)),
            _ => {
                return Ok(HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Issuer PersoanaFizica not found"
                })));
            }
        }
    } else if let Some(pj_id) = invoice.issuer_pj_id {
        match pj_repo.find_by_id(pj_id).await {
            Ok(Some(pj)) => (pj.cod_fiscal, pj.denumire),
            _ => {
                return Ok(HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Issuer PersoanaJuridica not found"
                })));
            }
        }
    } else {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Invoice has no issuer"
        })));
    };

    // Get customer (partner) information
    let partner = match partner_repo.find_by_id(invoice.partner_id).await {
        Ok(Some(p)) => p,
        _ => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Partner not found"
            })));
        }
    };

    let customer_cif = partner.cod_fiscal.unwrap_or_default();
    let customer_name = partner.denumire;

    // Generate UBL XML
    let xml = generate_ubl_xml(
        invoice.id,
        &invoice.number,
        invoice.issued_date,
        &issuer_cif,
        &issuer_name,
        &customer_cif,
        &customer_name,
        invoice.subtotal,
        invoice.total_vat,
        invoice.total,
    );

    Ok(HttpResponse::Ok().content_type("application/xml").body(xml))
}
