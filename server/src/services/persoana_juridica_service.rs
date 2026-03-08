use std::sync::Arc;

use actix_web::{HttpResponse, Responder, get};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{Error, FromRow, PgPool};
use uuid::Uuid;

use crate::models::{PersoanaJuridica, StarePersoanaJuridica};

// Ensure StarePersoanaJuridica is registered with sqlx
// Add #[derive(sqlx::Type)] to StarePersoanaJuridica in your models file

pub trait PersoanaJuridicaRepository: Send + Sync {
    async fn find_all(&self) -> Result<Vec<PersoanaJuridica>, Error>;
    async fn find_by_id(&self, id: Uuid) -> Result<PersoanaJuridica, Error>;
    async fn create(&self, persoana: PersoanaJuridica) -> Result<PersoanaJuridica, Error>;
    async fn update(&self, id: Uuid, persoana: PersoanaJuridica)
    -> Result<PersoanaJuridica, Error>;
    async fn delete(&self, id: Uuid) -> Result<bool, Error>;
}

pub type DynPersoanaJuridicaRepository = Arc<dyn PersoanaJuridicaRepository>;

pub struct PgPersoanaJuridicaRepository {
    pool: PgPool,
}

impl PgPersoanaJuridicaRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[derive(FromRow)]
struct PersoanaJuridicaRow {
    id: Uuid,
    cod_fiscal: String,
    denumire: String,
    numar_de_inregistrare_in_registrul_comertului: String,
    an_infiintare: i32,
    adresa_sediu_social: String,
    adresa_puncte_de_lucru: Option<String>,
    iban: String,
    telefon: Option<String>,
    email: Option<String>,
    cod_caen_principal: String,
    coduri_caen_secundare: Option<Vec<String>>,
    numar_angajati: i32,
    capital_social: f64,
    stare: StarePersoanaJuridica,
    wallet: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

fn row_to_model(row: PersoanaJuridicaRow) -> Result<PersoanaJuridica, sqlx::Error> {
    let stare = match row.stare.as_str() {};
}

#[async_trait]
impl PersoanaJuridicaRepository for PgPersoanaJuridicaRepository {
    async fn find_all(&self) -> Result<Vec<PersoanaJuridica>, Error> {
        let rows = sqlx::query_as::<_, PersoanaJuridicaRow>("SELECT * FROM persoana_juridica;")
            .fetch_all(&self.pool)
            .await?;
        rows.into_iter().map(row_to_model).collect()
    }
    async fn find_by_id(&self, id: Uuid) -> Result<PersoanaJuridica, Error> {
        todo!()
    }
    async fn create(&self, persoana: PersoanaJuridica) -> Result<PersoanaJuridica, Error> {
        todo!()
    }
    async fn update(
        &self,
        id: Uuid,
        persoana: PersoanaJuridica,
    ) -> Result<PersoanaJuridica, Error> {
        todo!()
    }
    async fn delete(&self, id: Uuid) -> Result<bool, Error> {
        todo!()
    }
}
