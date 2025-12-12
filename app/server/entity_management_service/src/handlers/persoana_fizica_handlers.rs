use actix_web::{
    HttpResponse, Responder, delete, get, post, put,
    web::{Data, Json, Path},
};

use sqlx::PgPool;
use utoipa::{self};
use uuid::Uuid;

use crate::{
    models::persoana_fizica::{PersoanaFizicaRequest, PersoanaFizicaResponse},
    services::{self},
};

#[utoipa::path(
    get,
    path = "/api/persoane-fizice",
    tag = "persoane-fizice",
    responses(
        (status = 200, description = "List of all persoane fizice", body = Vec<PersoanaFizicaResponse>),
        (status = 501, description = "Not implemented")
    )
)]
#[get("")]
pub async fn get_all_persoane_fizice(pool: Data<PgPool>) -> impl Responder {
    match services::get_all_persoane_fizice(pool).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(error) => {
            HttpResponse::NotFound().body(format!("Persoana_fizica not found: {:?}", error))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/persoane-fizice/{id}",
    tag = "persoane-fizice",
    params(
        ("id" = Uuid, Path, description = "Persoana fizica ID")
    ),
    responses(
        (status = 200, description = "Persoana fizica found", body = PersoanaFizicaResponse),
        (status = 404, description = "Persoana fizica not found")
    )
)]
#[get("{id}")]
pub async fn get_persoana_fizica_by_id(path: Path<Uuid>, pool: Data<PgPool>) -> impl Responder {
    match services::get_persoana_fizica_by_id(path, pool).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(error) => {
            HttpResponse::NotFound().body(format!("Persoana_fizica not found: {:?}", error))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/persoane-fizice",
    tag = "persoane-fizice",
    request_body = PersoanaFizicaRequest,
    responses(
        (status = 201, description = "Persoana fizica created successfully", body = PersoanaFizicaResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[post("")]
pub async fn create_new_persoana_fizica(
    body: Json<PersoanaFizicaRequest>,
    pool: Data<PgPool>,
) -> impl Responder {
    match services::create_new_persoana_fizica(body, pool).await {
        Ok(response) => response,
        Err(error) => HttpResponse::InternalServerError()
            .body(format!("Failed to create persoana_fizica: {}", error)),
    }
}

#[utoipa::path(
    delete,
    path = "/api/persoane-fizice/{id}",
    tag = "persoane-fizice",
    params(
        ("id" = Uuid, Path, description = "Persoana fizica ID")
    ),
    responses(
        (status = 200, description = "Persoana fizica deleted successfully"),
        (status = 404, description = "Persoana fizica not found")
    )
)]
#[delete("{id}")]
pub async fn delete_persoana_fizica(path: Path<Uuid>, pool: Data<PgPool>) -> impl Responder {
    match services::delete_persoana_fizica(path, pool).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Persoana fizica deleted successfully"
        })),
        Err(error) => {
            HttpResponse::NotFound().body(format!("Failed to delete persoana_fizica: {:?}", error))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/persoane-fizice/{id}",
    tag = "persoane-fizice",
    params(
        ("id" = Uuid, Path, description = "Persoana fizica ID")
    ),
    request_body = PersoanaFizicaRequest,
    responses(
        (status = 200, description = "Persoana fizica updated successfully", body = PersoanaFizicaResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[put("{id}")]
pub async fn update_persoana_fizica(
    path: Path<Uuid>,
    body: Json<PersoanaFizicaRequest>,
    pool: Data<PgPool>,
) -> impl Responder {
    match services::update_persoana_fizica(path, body, pool).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(error) => {
            eprintln!("Error updating persoana fizica: {:?}", error);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update persoana fizica",
                "details": error.to_string()
            }))
        }
    }
}
