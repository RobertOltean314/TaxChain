use actix_web::{
    HttpResponse, Responder, get, post,
    web::{Data, Json, Path},
};

use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    models::persoana_fizica::PersoanaFizicaRequest,
    services::{self},
};

#[get("/api/persoana_fizica/{id}")]
pub async fn get_persoana_fizica(path: Path<Uuid>, pool: Data<PgPool>) -> impl Responder {
    match services::get_persoana_fizica_by_id(path, pool).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(error) => {
            HttpResponse::NotFound().body(format!("Persoana_fizica not found: {:?}", error))
        }
    }
}

#[post("/api/persoana_fizica")]
pub async fn create_persoana_fizica(
    body: Json<PersoanaFizicaRequest>,
    pool: Data<PgPool>,
) -> impl Responder {
    match services::create_new_persoana_fizica(body, pool).await {
        Ok(response) => response,
        Err(error) => HttpResponse::InternalServerError()
            .body(format!("Failed to create persoana_fizica: {}", error)),
    }
}
