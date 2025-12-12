use actix_web::{
    HttpResponse, Responder, delete, get, post, put,
    web::{Data, Json, Path},
};

use sqlx::PgPool;
use utoipa;
use uuid::Uuid;

use crate::models::ong::{OngRequest, OngResponse};

#[utoipa::path(
    get,
    path = "/api/ongs",
    tag = "ongs",
    responses(
        (status = 200, description = "List of all ongs", body = Vec<OngResponse>),
        (status = 501, description = "Not implemented")
    )
)]
#[get("")]
pub async fn get_all_ongs() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    get,
    path = "/api/ongs/{id}",
    tag = "ongs",
    params(
        ("id" = Uuid, Path, description = "ONG ID")
    ),
    responses(
        (status = 200, description = "ONG found", body = OngResponse),
        (status = 404, description = "ONG not found")
    )
)]
#[get("{id}")]
pub async fn get_ong_by_id() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    post,
    path = "/api/ongs",
    tag = "ongs",
    request_body = OngRequest,
    responses(
        (status = 201, description = "ONG created successfully", body = OngResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[post("")]
pub async fn create_new_ong() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    delete,
    path = "/api/ongs/{id}",
    tag = "ongs",
    params(
        ("id" = Uuid, Path, description = "ONG ID")
    ),
    responses(
        (status = 200, description = "ONG deleted successfully"),
        (status = 404, description = "ONG not found")
    )
)]
#[delete("{id}")]
pub async fn delete_ong() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    put,
    path = "/api/ongs/{id}",
    tag = "ongs",
    params(
        ("id" = Uuid, Path, description = "ONG ID")
    ),
    request_body = OngRequest,
    responses(
        (status = 200, description = "ONG updated successfully", body = OngResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[put("{id}")]
pub async fn update_ong() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}
