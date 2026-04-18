use actix_web::{HttpResponse, Responder, get, web};
use chrono::{NaiveDate, Utc};
use serde::Deserialize;
use serde_json::json;

use crate::services::bnr_service::DynBnrService;

#[derive(Deserialize)]
pub struct BnrQuery {
    pub currency: String,
    pub date: Option<String>, // ISO 8601: "2025-01-15"
}

/// `GET /curs-bnr?currency=EUR&date=2025-01-15`
///
/// Returns the BNR exchange rate for the given currency and date.
/// `date` defaults to today if not provided.
/// RON always returns 1.0.
#[get("")]
pub async fn get_bnr_rate(
    bnr: web::Data<DynBnrService>,
    query: web::Query<BnrQuery>,
) -> impl Responder {
    let currency = query.currency.to_uppercase();

    if currency == "RON" {
        return HttpResponse::Ok().json(json!({
            "currency": "RON",
            "rate": "1.000000",
            "date": Utc::now().date_naive().to_string()
        }));
    }

    let date = match &query.date {
        Some(d) => match NaiveDate::parse_from_str(d, "%Y-%m-%d") {
            Ok(parsed) => parsed,
            Err(_) => {
                return HttpResponse::BadRequest()
                    .json(json!({"error": "Invalid date format. Use YYYY-MM-DD"}));
            }
        },
        None => Utc::now().date_naive(),
    };

    match bnr.get_rate(&currency, date).await {
        Ok(rate) => HttpResponse::Ok().json(json!({
            "currency": currency,
            "rate": rate.to_string(),
            "date": date.to_string()
        })),
        Err(e) => {
            eprintln!("BNR rate error: {e}");
            HttpResponse::ServiceUnavailable().json(json!({
                "error": "Could not fetch BNR exchange rate",
                "details": e.to_string()
            }))
        }
    }
}
