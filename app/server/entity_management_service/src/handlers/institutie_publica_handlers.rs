use actix_web::{HttpResponse, Responder, delete, get, post, put};

use utoipa;

use crate::models::institutie_publica::{InstitutiePublicaRequest, InstitutiePublicaResponse};

#[utoipa::path(
    get,
    path = "/api/institutii-publice",
    tag = "institutii-publice",
    responses(
        (status = 200, description = "List of all institutii publice", body = Vec<InstitutiePublicaResponse>),
        (status = 501, description = "Not implemented")
    )
)]
#[get("")]
pub async fn get_all_institutii_publice() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    get,
    path = "/api/institutii-publice/{id}",
    tag = "institutii-publice",
    params(
        ("id" = Uuid, Path, description = "Institutie Publica ID")
    ),
    responses(
        (status = 200, description = "Institutie publica found", body = InstitutiePublicaResponse),
        (status = 404, description = "Institutie publica not found")
    )
)]
#[get("{id}")]
pub async fn get_institutie_publica_by_id() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    post,
    path = "/api/institutii-publice",
    tag = "institutii-publice",
    request_body = InstitutiePublicaRequest,
    responses(
        (status = 201, description = "Institutie publica created successfully", body = InstitutiePublicaResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[post("")]
pub async fn create_new_institutie_publica() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    delete,
    path = "/api/institutii-publice/{id}",
    tag = "institutii-publice",
    params(
        ("id" = Uuid, Path, description = "Institutie publica ID")
    ),
    responses(
        (status = 200, description = "Institutie publica deleted successfully"),
        (status = 404, description = "Institutie publica not found")
    )
)]
#[delete("{id}")]
pub async fn delete_institutie_publica() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    put,
    path = "/api/institutii-publice/{id}",
    tag = "institutii-publice",
    params(
        ("id" = Uuid, Path, description = "Institutie publica ID")
    ),
    request_body = InstitutiePublicaRequest,
    responses(
        (status = 200, description = "Institutie publica updated successfully", body = InstitutiePublicaResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[put("{id}")]
pub async fn update_institutie_publica() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}
