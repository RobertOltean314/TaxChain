use actix_web::{HttpRequest, HttpResponse, Responder, delete, get, patch, post, put, web};
use serde_json::json;
use uuid::Uuid;
use validator::Validate;

use crate::auth::middleware::{AuthenticatedUser, require_role};
use crate::models::{
    Invoice, InvoicePaymentRequest, InvoiceRequest, InvoiceStatus, InvoiceStatusRequest, UserRole,
};
use crate::services::invoice_service::DynInvoiceRepository;

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
// HANDLERS
// ============================================================================

/// `GET /invoice` — list all invoices owned by the authenticated user.
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

    match repo.find_all_for_user(user_id).await {
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

/// `GET /invoice/:id` — full invoice with lines.
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

    // Taxpayers may only view their own invoices
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

/// `POST /invoice` — create a new invoice with lines (Admin or Taxpayer).
#[post("")]
pub async fn create_invoice(
    req: HttpRequest,
    repo: web::Data<DynInvoiceRepository>,
    body: web::Json<InvoiceRequest>,
) -> impl Responder {
    let (_, user_id) = match authenticated(&req, &[UserRole::Admin, UserRole::Taxpayer]) {
        Ok(v) => v,
        Err(r) => return r,
    };

    if let Err(errors) = body.validate() {
        return HttpResponse::UnprocessableEntity().json(json!({
            "error": "Validation failed",
            "details": errors.to_string()
        }));
    }

    if body.issuer_pf_id.is_none() && body.issuer_pj_id.is_none() {
        return HttpResponse::UnprocessableEntity().json(json!({
            "error": "At least one issuer (issuer_pf_id or issuer_pj_id) is required"
        }));
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

/// `PUT /invoice/:id` — replace header + lines (Draft only, Admin or Taxpayer own).
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

/// `PATCH /invoice/:id/status` — advance the invoice lifecycle.
///
/// Role matrix:
///   Draft → Issued, Issued → Sent, Sent → Paid : Admin + Taxpayer (own only)
///   Any → Cancelled                            : Admin + Taxpayer (own only)
///   Auditor                                    : read-only, cannot change status
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

/// `PATCH /invoice/:id/payment` — record a cumulative payment amount.
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

    if body.amount > existing.total {
        return HttpResponse::UnprocessableEntity().json(json!({
            "error": "Payment amount exceeds invoice total",
            "invoice_total": existing.total.to_string(),
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

/// `DELETE /invoice/:id` — only Draft invoices can be deleted.
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

    if existing.status != InvoiceStatus::Draft {
        return HttpResponse::Conflict().json(json!({
            "error": "Only Draft invoices can be deleted",
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
