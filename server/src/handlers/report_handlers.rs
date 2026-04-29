use actix_web::{HttpRequest, HttpResponse, Responder, get, web};
use chrono::{Datelike, NaiveDate, Utc};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::auth::middleware::require_role;
use crate::models::UserRole;
use crate::models::entity_model::EntityContext;
use crate::services::report_service::DynReportService;

#[derive(Deserialize)]
pub struct VatSummaryQuery {
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

/// `GET /reports/vat-summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
///
/// Returns VAT aggregated by rate and transaction type for the given period,
/// scoped to the active entity (from X-Entity-Type / X-Entity-Id headers).
/// Defaults to the current calendar quarter if no dates provided.
#[get("/vat-summary")]
pub async fn get_vat_summary(
    req: HttpRequest,
    svc: web::Data<DynReportService>,
    query: web::Query<VatSummaryQuery>,
) -> impl Responder {
    if let Err(r) = require_role(
        &req,
        &[UserRole::Admin, UserRole::Taxpayer],
    ) {
        return r;
    }

    let ctx = match extract_entity(&req) {
        Ok(c) => c,
        Err(r) => return r,
    };

    let today = Utc::now().date_naive();
    let (default_from, default_to) = current_quarter_range(today);

    let from = match &query.from {
        Some(s) => match NaiveDate::parse_from_str(s, "%Y-%m-%d") {
            Ok(d) => d,
            Err(_) => {
                return HttpResponse::BadRequest()
                    .json(json!({"error": "Invalid 'from' date. Use YYYY-MM-DD"}));
            }
        },
        None => default_from,
    };

    let to = match &query.to {
        Some(s) => match NaiveDate::parse_from_str(s, "%Y-%m-%d") {
            Ok(d) => d,
            Err(_) => {
                return HttpResponse::BadRequest()
                    .json(json!({"error": "Invalid 'to' date. Use YYYY-MM-DD"}));
            }
        },
        None => default_to,
    };

    if from > to {
        return HttpResponse::BadRequest()
            .json(json!({"error": "'from' must be before or equal to 'to'"}));
    }

    match svc.vat_summary(&ctx.entity_type, ctx.entity_id, from, to).await {
        Ok(summary) => HttpResponse::Ok().json(summary),
        Err(e) => {
            eprintln!("vat_summary error: {e}");
            HttpResponse::InternalServerError()
                .json(json!({"error": "Failed to compute VAT summary", "details": e.to_string()}))
        }
    }
}

fn current_quarter_range(today: NaiveDate) -> (NaiveDate, NaiveDate) {
    let year = today.year();
    let quarter = (today.month0() / 3) as i32;
    let from_month = quarter * 3 + 1;
    let to_month = from_month + 2;
    let from = NaiveDate::from_ymd_opt(year, from_month as u32, 1).unwrap_or(today);
    let to = last_day_of_month(year, to_month as u32);
    (from, to)
}

fn last_day_of_month(year: i32, month: u32) -> NaiveDate {
    let next = if month == 12 {
        NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else {
        NaiveDate::from_ymd_opt(year, month + 1, 1)
    };
    next.unwrap_or_else(|| NaiveDate::from_ymd_opt(year, month, 28).unwrap())
        .pred_opt()
        .unwrap()
}
