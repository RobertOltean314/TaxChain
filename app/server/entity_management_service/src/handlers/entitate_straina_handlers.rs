use actix_web::{HttpResponse, Responder, delete, get, post, put};

use utoipa;

use crate::models::entitate_straina::{EntitateStrainaRequest, EntitateStrainaResponse};

#[utoipa::path(
    get,
    path = "/api/entitati-straine",
    tag = "entitati-straine",
    responses(
        (status = 200, description = "List of all entitati straine", body = Vec<EntitateStrainaResponse>),
        (status = 501, description = "Not implemented")
    )
)]
#[get("")]
pub async fn get_all_entitati_straine() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    get,
    path = "/api/entitati-straine/{id}",
    tag = "entitati-straine",
    params(
        ("id" = Uuid, Path, description = "Entitate Straina ID")
    ),
    responses(
        (status = 200, description = "Entitate straina found", body = EntitateStrainaResponse),
        (status = 404, description = "Entitate straina not found")
    )
)]
#[get("{id}")]
pub async fn get_entitate_straina_by_id() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    post,
    path = "/api/entitati-straine",
    tag = "entitati-straine",
    request_body = EntitateStrainaRequest,
    responses(
        (status = 201, description = "Entitate straina created successfully", body = EntitateStrainaResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[post("")]
pub async fn create_new_entitate_straina() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    delete,
    path = "/api/entitati-straine/{id}",
    tag = "entitati-straine",
    params(
        ("id" = Uuid, Path, description = "Entitate straina ID")
    ),
    responses(
        (status = 200, description = "Entitate straina deleted successfully"),
        (status = 404, description = "Entitate straina not found")
    )
)]
#[delete("{id}")]
pub async fn delete_entitate_straina() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}

#[utoipa::path(
    put,
    path = "/api/entitati-straine/{id}",
    tag = "entitati-straine",
    params(
        ("id" = Uuid, Path, description = "Entitate straina ID")
    ),
    request_body = EntitateStrainaRequest,
    responses(
        (status = 200, description = "Entitate straina updated successfully", body = EntitateStrainaResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[put("{id}")]
pub async fn update_entitate_straina() -> impl Responder {
    HttpResponse::NotImplemented().body("Must implement this function")
}
