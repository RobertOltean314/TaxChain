use actix_web::{HttpRequest, HttpResponse, Responder, delete, get, patch, post, put, web};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;
use validator::Validate;

use crate::auth::middleware::{AuthenticatedUser, require_role};
use crate::models::{
    Invoice, InvoicePaymentRequest, InvoiceRequest, InvoiceStatus, InvoiceStatusRequest, UserRole,
};
use crate::models::entity_model::EntityContext;
use crate::services::{invoice_service::DynInvoiceRepository, user_service::DynUserRepository};

/// Extract `X-Entity-Type` and `X-Entity-Id` headers. Returns 400 if missing/invalid.
fn extract_entity(req: &HttpRequest) -> Result<EntityContext, HttpResponse> {
    let entity_type = req
        .headers()
        .get("X-Entity-Type")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_uppercase())
        .filter(|s| s == "PF" || s == "PJ")
        .ok_or_else(|| {
            HttpResponse::BadRequest()
                .json(json!({"error": "Missing or invalid X-Entity-Type header (must be PF or PJ)"}))
        })?;

    let entity_id = req
        .headers()
        .get("X-Entity-Id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| {
            HttpResponse::BadRequest()
                .json(json!({"error": "Missing or invalid X-Entity-Id header (must be a UUID)"}))
        })?;

    Ok(EntityContext { entity_type, entity_id })
}

// ============================================================================
// HELPER — extract authenticated user + user_id in one call
// ============================================================================

fn authenticated(
    req: &HttpRequest,
    allowed: &[UserRole],
) -> Result<(AuthenticatedUser, Uuid), HttpResponse> {
    let user = require_role(req, allowed)?;
    let user_id = user.claims().user_id().map_err(|_| {
        HttpResponse::InternalServerError().json(json!({ "error": "Invalid user ID in JWT token" }))
    })?;
    Ok((user, user_id))
}

// ============================================================================
// QUERY PARAMS
// ============================================================================

#[derive(Deserialize)]
pub struct NextNumberQuery {
    pub series: String,
}

// ============================================================================
// HANDLERS
// ============================================================================

/// `GET /factura/next-number?series=FC`
///
/// Suggests the next invoice number for the given series, scoped to the
/// authenticated user's issuer entity.
///
/// Logic: find MAX(numar) in factura for this series + this user's entity,
/// parse the integer suffix, increment by 1, return the suggestion.
/// The user is free to override — this is advisory only.
///
/// Response: `{ "series": "FC", "next_number": "FC-2025-007" }`
///
/// NOTE: This handler must be registered BEFORE `/{id}` in the scope,
/// otherwise Actix will try to parse "next-number" as a UUID and return 400.
#[get("/next-number")]
pub async fn get_next_invoice_number(
    req: HttpRequest,
    repo: web::Data<DynInvoiceRepository>,
    query: web::Query<NextNumberQuery>,
) -> impl Responder {
    let (_, user_id) = match authenticated(
        &req,
        &[UserRole::Admin, UserRole::Auditor, UserRole::Taxpayer],
    ) {
        Ok(v) => v,
        Err(r) => return r,
    };

    let series = query.series.trim().to_uppercase();

    if series.is_empty() {
        return HttpResponse::UnprocessableEntity()
            .json(json!({ "error": "series query parameter cannot be empty" }));
    }

    match repo.get_next_number_for_series(user_id, &series).await {
        Ok(next_number) => HttpResponse::Ok().json(json!({
            "series": series,
            "next_number": next_number
        })),
        Err(e) => {
            eprintln!("get_next_invoice_number error: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to compute next invoice number",
                "details": e.to_string()
            }))
        }
    }
}

/// `GET /factura` — list all invoices owned by the authenticated user.
#[get("")]
pub async fn find_all_invoices(
    req: HttpRequest,
    repo: web::Data<DynInvoiceRepository>,
) -> impl Responder {
    let (_, user_id) = match authenticated(
        &req,
        &[UserRole::Admin, UserRole::Auditor, UserRole::Taxpayer],
    ) {
        Ok(v) => v,
        Err(r) => return r,
    };

    let ctx = match extract_entity(&req) {
        Ok(c) => c,
        Err(r) => return r,
    };

    match repo.find_all_for_entity(user_id, &ctx.entity_type, ctx.entity_id).await {
        Ok(list) => HttpResponse::Ok().json(list),
        Err(e) => {
            eprintln!("find_all_invoices error: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to retrieve invoices",
                "details": e.to_string()
            }))
        }
    }
}

/// `GET /factura/:id` — full invoice with lines.
#[get("/{id}")]
pub async fn get_invoice_by_id(
    req: HttpRequest,
    repo: web::Data<DynInvoiceRepository>,
    path: web::Path<Uuid>,
) -> impl Responder {
    let (user, user_id) = match authenticated(
        &req,
        &[UserRole::Admin, UserRole::Auditor, UserRole::Taxpayer],
    ) {
        Ok(v) => v,
        Err(r) => return r,
    };

    let id = path.into_inner();

    let invoice = match repo.find_by_id(id).await {
        Ok(Some(inv)) => inv,
        Ok(None) => {
            return HttpResponse::NotFound()
                .json(json!({ "error": format!("Invoice {} not found", id) }));
        }
        Err(e) => {
            eprintln!("get_invoice_by_id error: {e}");
            return HttpResponse::InternalServerError().json(json!({
                "error": "Failed to retrieve invoice",
                "details": e.to_string()
            }));
        }
    };

    if user.claims().role == UserRole::Taxpayer && invoice.created_by != user_id {
        return HttpResponse::Forbidden()
            .json(json!({ "error": "Access denied — you can only view your own invoices" }));
    }

    let lines = match repo.find_lines(id).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("find_lines error: {e}");
            return HttpResponse::InternalServerError().json(json!({
                "error": "Failed to retrieve invoice lines",
                "details": e.to_string()
            }));
        }
    };

    HttpResponse::Ok().json(json!({ "invoice": invoice, "lines": lines }))
}

/// `POST /factura` — create a new invoice with lines (Admin or Taxpayer).
#[post("")]
pub async fn create_invoice(
    req: HttpRequest,
    repo: web::Data<DynInvoiceRepository>,
    user_repo: web::Data<DynUserRepository>,
    mut body: web::Json<InvoiceRequest>,
) -> impl Responder {
    let (user, user_id) = match authenticated(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(v) => v,
        Err(r) => return r,
    };

    if let Err(errors) = body.validate() {
        return HttpResponse::UnprocessableEntity().json(json!({
            "error": "Validation failed",
            "details": errors.to_string()
        }));
    }

    // Auto-set issuer if not provided
    if body.issuer_pf_id.is_none() && body.issuer_pj_id.is_none() {
        if user.claims().role == UserRole::Taxpayer {
            let mut issuer_pf = user.claims().persoana_fizica_id;
            let mut issuer_pj = user.claims().persoana_juridica_id;

            if issuer_pf.is_none() && issuer_pj.is_none() {
                if let Ok(user_id) = Uuid::parse_str(&user.claims().sub) {
                    if let Ok(Some(stored_user)) = user_repo.find_by_id(user_id).await {
                        issuer_pf = stored_user.persoana_fizica_id;
                        issuer_pj = stored_user.persoana_juridica_id;
                    }
                }
            }

            if let Some(pf_id) = issuer_pf {
                body.issuer_pf_id = Some(pf_id);
            } else if let Some(pj_id) = issuer_pj {
                body.issuer_pj_id = Some(pj_id);
            } else {
                return HttpResponse::UnprocessableEntity().json(json!({
                    "error": "No issuer entity found. Please create a PersoanaFizica or PersoanaJuridica profile first."
                }));
            }
        } else {
            // Admins must explicitly specify an issuer
            return HttpResponse::UnprocessableEntity().json(json!({
                "error": "At least one issuer (issuer_pf_id or issuer_pj_id) is required"
            }));
        }
    }

    if body.lines.is_empty() {
        return HttpResponse::UnprocessableEntity()
            .json(json!({ "error": "An invoice must contain at least one line item" }));
    }

    let invoice = Invoice::from_request(&body, user_id);
    let lines = body.into_inner().lines;

    match repo.create(invoice, lines).await {
        Ok(created) => HttpResponse::Created().json(created),
        Err(e) => {
            eprintln!("create_invoice error: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to create invoice",
                "details": e.to_string()
            }))
        }
    }
}

/// `PUT /factura/:id` — replace header + lines (Draft only, Admin or Taxpayer own).
#[put("/{id}")]
pub async fn update_invoice(
    req: HttpRequest,
    repo: web::Data<DynInvoiceRepository>,
    path: web::Path<Uuid>,
    body: web::Json<InvoiceRequest>,
) -> impl Responder {
    let (user, user_id) = match authenticated(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(v) => v,
        Err(r) => return r,
    };

    if let Err(errors) = body.validate() {
        return HttpResponse::UnprocessableEntity().json(json!({
            "error": "Validation failed",
            "details": errors.to_string()
        }));
    }

    if body.lines.is_empty() {
        return HttpResponse::UnprocessableEntity()
            .json(json!({ "error": "An invoice must contain at least one line item" }));
    }

    let id = path.into_inner();

    let existing = match repo.find_by_id(id).await {
        Ok(Some(inv)) => inv,
        Ok(None) => {
            return HttpResponse::NotFound()
                .json(json!({ "error": format!("Invoice {} not found", id) }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(json!({
                "error": "Failed to fetch invoice",
                "details": e.to_string()
            }));
        }
    };

    if existing.status != InvoiceStatus::Draft {
        return HttpResponse::Conflict().json(json!({
            "error": "Only Draft invoices can be edited",
            "current_status": format!("{:?}", existing.status)
        }));
    }

    if user.claims().role != UserRole::Admin && existing.created_by != user_id {
        return HttpResponse::Forbidden()
            .json(json!({ "error": "Access denied — you can only edit your own invoices" }));
    }

    let updated = Invoice::update_from_request(&existing, &body);
    let lines = body.into_inner().lines;

    match repo.update(id, updated, lines, user_id).await {
        Ok(Some(inv)) => HttpResponse::Ok().json(inv),
        Ok(None) => {
            HttpResponse::NotFound().json(json!({ "error": format!("Invoice {} not found", id) }))
        }
        Err(e) => {
            eprintln!("update_invoice error: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to update invoice",
                "details": e.to_string()
            }))
        }
    }
}

/// `PATCH /factura/:id/status` — advance the invoice lifecycle.
#[patch("/{id}/status")]
pub async fn update_invoice_status(
    req: HttpRequest,
    repo: web::Data<DynInvoiceRepository>,
    path: web::Path<Uuid>,
    body: web::Json<InvoiceStatusRequest>,
) -> impl Responder {
    let (user, user_id) = match authenticated(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(v) => v,
        Err(r) => return r,
    };

    let id = path.into_inner();

    let existing = match repo.find_by_id(id).await {
        Ok(Some(inv)) => inv,
        Ok(None) => {
            return HttpResponse::NotFound()
                .json(json!({ "error": format!("Invoice {} not found", id) }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(json!({
                "error": "Failed to fetch invoice",
                "details": e.to_string()
            }));
        }
    };

    if user.claims().role != UserRole::Admin && existing.created_by != user_id {
        return HttpResponse::Forbidden().json(json!({
            "error": "Access denied — you can only change the status of your own invoices"
        }));
    }

    if !existing.status.can_transition_to(body.status) {
        return HttpResponse::Conflict().json(json!({
            "error": format!(
                "Invalid status transition: {:?} → {:?}",
                existing.status, body.status
            )
        }));
    }

    match repo.update_status(id, body.status, user_id).await {
        Ok(Some(inv)) => HttpResponse::Ok().json(inv),
        Ok(None) => {
            HttpResponse::NotFound().json(json!({ "error": format!("Invoice {} not found", id) }))
        }
        Err(e) => {
            eprintln!("update_invoice_status error: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to update invoice status",
                "details": e.to_string()
            }))
        }
    }
}

/// `PATCH /factura/:id/payment` — record a cumulative payment amount.
#[patch("/{id}/payment")]
pub async fn update_invoice_payment(
    req: HttpRequest,
    repo: web::Data<DynInvoiceRepository>,
    path: web::Path<Uuid>,
    body: web::Json<InvoicePaymentRequest>,
) -> impl Responder {
    let (user, user_id) = match authenticated(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(v) => v,
        Err(r) => return r,
    };

    if let Err(errors) = body.validate() {
        return HttpResponse::UnprocessableEntity().json(json!({
            "error": "Validation failed",
            "details": errors.to_string()
        }));
    }

    let id = path.into_inner();

    let existing = match repo.find_by_id(id).await {
        Ok(Some(inv)) => inv,
        Ok(None) => {
            return HttpResponse::NotFound()
                .json(json!({ "error": format!("Invoice {} not found", id) }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(json!({
                "error": "Failed to fetch invoice",
                "details": e.to_string()
            }));
        }
    };

    if user.claims().role != UserRole::Admin && existing.created_by != user_id {
        return HttpResponse::Forbidden().json(json!({
            "error": "Access denied — you can only record payments for your own invoices"
        }));
    }

    if body.amount < rust_decimal::Decimal::ZERO {
        return HttpResponse::UnprocessableEntity()
            .json(json!({ "error": "Payment amount cannot be negative" }));
    }

    if body.amount > existing.amount_due {
        return HttpResponse::UnprocessableEntity().json(json!({
            "error": "Payment amount exceeds remaining invoice balance",
            "amount_due": existing.amount_due.to_string(),
            "requested": body.amount.to_string()
        }));
    }

    match repo.update_payment(id, body.amount, user_id).await {
        Ok(Some(inv)) => HttpResponse::Ok().json(inv),
        Ok(None) => {
            HttpResponse::NotFound().json(json!({ "error": format!("Invoice {} not found", id) }))
        }
        Err(e) => {
            eprintln!("update_invoice_payment error: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to record payment",
                "details": e.to_string()
            }))
        }
    }
}

/// `DELETE /factura/:id` — only Draft invoices can be deleted.
#[delete("/{id}")]
pub async fn delete_invoice(
    req: HttpRequest,
    repo: web::Data<DynInvoiceRepository>,
    path: web::Path<Uuid>,
) -> impl Responder {
    let (user, user_id) = match authenticated(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(v) => v,
        Err(r) => return r,
    };

    let id = path.into_inner();

    let existing = match repo.find_by_id(id).await {
        Ok(Some(inv)) => inv,
        Ok(None) => {
            return HttpResponse::NotFound()
                .json(json!({ "error": format!("Invoice {} not found", id) }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(json!({
                "error": "Failed to fetch invoice",
                "details": e.to_string()
            }));
        }
    };

    if user.claims().role != UserRole::Admin && existing.created_by != user_id {
        return HttpResponse::Forbidden()
            .json(json!({ "error": "Access denied — you can only delete your own invoices" }));
    }

    if existing.status != InvoiceStatus::Draft && existing.status != InvoiceStatus::Paid {
        return HttpResponse::Conflict().json(json!({
            "error": "Only Draft or Paid invoices can be deleted",
            "current_status": format!("{:?}", existing.status)
        }));
    }

    match repo.delete(id, user_id).await {
        Ok(true) => HttpResponse::NoContent().finish(),
        Ok(false) => {
            HttpResponse::NotFound().json(json!({ "error": format!("Invoice {} not found", id) }))
        }
        Err(e) => {
            eprintln!("delete_invoice error: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to delete invoice",
                "details": e.to_string()
            }))
        }
    }
}
