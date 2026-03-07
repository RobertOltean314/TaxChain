use actix_web::{HttpResponse, Responder, delete, get, post, put, web};
use chrono::{NaiveDate, Utc};
use serde::Deserialize;
use uuid::Uuid;
use validator::Validate;

use crate::models::{PersoanaFizica, Sex, StarePersoanaFizica};
use crate::services::persoana_fizica_service::{self, PersoanaFizicaStore};
use crate::validators::{validate_cnp, validate_cod_postal, validate_iban, validate_telefon};

/// Request body used for both create and update operations.
#[derive(Debug, Deserialize, Validate)]
pub struct PersoanaFizicaRequest {
    #[validate(custom(function = "validate_cnp"))]
    pub cnp: String,

    #[validate(length(min = 1, max = 50, message = "Nume must be 1-50 characters"))]
    pub nume: String,

    #[validate(length(min = 1, max = 50, message = "Prenume must be 1-50 characters"))]
    pub prenume: String,

    #[validate(length(max = 30, message = "Prenume tata must be max 30 characters"))]
    pub prenume_tata: Option<String>,

    pub data_nasterii: NaiveDate,

    pub sex: Sex,

    #[validate(length(min = 1, max = 200, message = "Adresa must be 1-200 characters"))]
    pub adresa_domiciliu: String,

    #[validate(custom(function = "validate_cod_postal"))]
    pub cod_postal: Option<String>,

    #[validate(custom(function = "validate_iban"))]
    pub iban: String,

    #[validate(custom(function = "validate_telefon"))]
    pub telefon: Option<String>,

    #[validate(email(message = "Invalid email format"))]
    #[validate(length(max = 100, message = "Email must be max 100 characters"))]
    pub email: Option<String>,

    pub stare: Option<StarePersoanaFizica>,

    #[validate(length(max = 100, message = "Wallet must be max 100 characters"))]
    pub wallet: Option<String>,
}

/// GET /persoana-fizica — returns all records.
#[get("")]
pub async fn persoana_fizica_handler(store: web::Data<PersoanaFizicaStore>) -> impl Responder {
    let result = persoana_fizica_service::find_all(store.get_ref());
    HttpResponse::Ok().json(result)
}

/// GET /persoana-fizica/{id} — returns a single record by UUID.
#[get("/{id}")]
pub async fn get_persoana_fizica_by_id(
    store: web::Data<PersoanaFizicaStore>,
    path: web::Path<Uuid>,
) -> impl Responder {
    let id = path.into_inner();
    match persoana_fizica_service::find_by_id(store.get_ref(), id) {
        Some(p) => HttpResponse::Ok().json(p),
        None => HttpResponse::NotFound()
            .body(format!("PersoanaFizica with id {} not found", id)),
    }
}

/// POST /persoana-fizica — creates a new record.
#[post("")]
pub async fn create_persoana_fizica(
    store: web::Data<PersoanaFizicaStore>,
    body: web::Json<PersoanaFizicaRequest>,
) -> impl Responder {
    if let Err(errors) = body.validate() {
        return HttpResponse::BadRequest().body(errors.to_string());
    }
    let now = Utc::now();
    let persoana = PersoanaFizica {
        id: Uuid::new_v4(),
        cnp: body.cnp.clone(),
        nume: body.nume.clone(),
        prenume: body.prenume.clone(),
        prenume_tata: body.prenume_tata.clone(),
        data_nasterii: body.data_nasterii,
        sex: body.sex,
        adresa_domiciliu: body.adresa_domiciliu.clone(),
        cod_postal: body.cod_postal.clone(),
        iban: body.iban.clone(),
        telefon: body.telefon.clone(),
        email: body.email.clone(),
        stare: body.stare.unwrap_or_default(),
        wallet: body.wallet.clone(),
        created_at: now,
        updated_at: now,
    };
    let created = persoana_fizica_service::create(store.get_ref(), persoana);
    HttpResponse::Created().json(created)
}

/// PUT /persoana-fizica/{id} — fully replaces an existing record.
#[put("/{id}")]
pub async fn update_persoana_fizica(
    store: web::Data<PersoanaFizicaStore>,
    path: web::Path<Uuid>,
    body: web::Json<PersoanaFizicaRequest>,
) -> impl Responder {
    if let Err(errors) = body.validate() {
        return HttpResponse::BadRequest().body(errors.to_string());
    }
    let id = path.into_inner();
    let existing = match persoana_fizica_service::find_by_id(store.get_ref(), id) {
        Some(p) => p,
        None => {
            return HttpResponse::NotFound()
                .body(format!("PersoanaFizica with id {} not found", id));
        }
    };
    let persoana = PersoanaFizica {
        id,
        cnp: body.cnp.clone(),
        nume: body.nume.clone(),
        prenume: body.prenume.clone(),
        prenume_tata: body.prenume_tata.clone(),
        data_nasterii: body.data_nasterii,
        sex: body.sex,
        adresa_domiciliu: body.adresa_domiciliu.clone(),
        cod_postal: body.cod_postal.clone(),
        iban: body.iban.clone(),
        telefon: body.telefon.clone(),
        email: body.email.clone(),
        stare: body.stare.unwrap_or(existing.stare),
        wallet: body.wallet.clone(),
        created_at: existing.created_at,
        updated_at: Utc::now(),
    };
    match persoana_fizica_service::update(store.get_ref(), id, persoana) {
        Some(p) => HttpResponse::Ok().json(p),
        None => HttpResponse::NotFound()
            .body(format!("PersoanaFizica with id {} not found", id)),
    }
}

/// DELETE /persoana-fizica/{id} — removes a record.
#[delete("/{id}")]
pub async fn delete_persoana_fizica(
    store: web::Data<PersoanaFizicaStore>,
    path: web::Path<Uuid>,
) -> impl Responder {
    let id = path.into_inner();
    if persoana_fizica_service::delete(store.get_ref(), id) {
        HttpResponse::NoContent().finish()
    } else {
        HttpResponse::NotFound().body(format!("PersoanaFizica with id {} not found", id))
    }
}

