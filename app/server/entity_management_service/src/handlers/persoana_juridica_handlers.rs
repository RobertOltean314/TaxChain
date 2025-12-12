use actix_web::{
    HttpResponse, Responder, delete, get, post, put,
    web::{Data, Json, Path},
};

use sqlx::PgPool;
use utoipa;
use uuid::Uuid;

use crate::models::persoana_juridica::{PersoanaJuridicaRequest, PersoanaJuridicaResponse};

#[utoipa::path(
    get,
    path = "/api/persoane-juridice",
    tag = "persoane-juridice",
    responses(
        (status = 200, description = "List of all persoane juridice", body = Vec<PersoanaJuridicaResponse>),
        (status = 501, description = "Not implemented")
    )
)]
#[get("")]
pub async fn get_all_persoane_juridice() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    get,
    path = "/api/persoane-juridice/{id}",
    tag = "persoane-juridice",
    params(
        ("id" = Uuid, Path, description = "Persoana Juridica ID")
    ),
    responses(
        (status = 200, description = "Persoana juridica found", body = PersoanaJuridicaResponse),
        (status = 404, description = "Persoana juridica not found")
    )
)]
#[get("{id}")]
pub async fn get_persoana_juridica_by_id() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    post,
    path = "/api/persoane-juridice",
    tag = "persoane-juridice",
    request_body = PersoanaJuridicaRequest,
    responses(
        (status = 201, description = "Persoana fizica created successfully", body = PersoanaJuridicaResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[post("")]
pub async fn create_new_persoana_juridica() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    delete,
    path = "/api/persoane-juridice/{id}",
    tag = "persoane-juridice",
    params(
        ("id" = Uuid, Path, description = "Persoana juridica ID")
    ),
    responses(
        (status = 200, description = "Persoana juridica deleted successfully"),
        (status = 404, description = "Persoana juridica not found")
    )
)]
#[delete("{id}")]
pub async fn delete_persoana_juridica() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    put,
    path = "/api/persoane-juridice/{id}",
    tag = "persoane-juridice",
    params(
        ("id" = Uuid, Path, description = "Persoana juridica ID")
    ),
    request_body = PersoanaJuridicaRequest,
    responses(
        (status = 200, description = "Persoana juridica updated successfully", body = PersoanaJuridicaResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[put("{id}")]
pub async fn update_persoana_juridica() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}
