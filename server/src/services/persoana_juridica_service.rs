use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{Error, FromRow, PgPool};
use uuid::Uuid;

use crate::models::{PersoanaJuridica, StarePersoanaJuridica};

const FIND_ALL_PERSOANE_JURIDICE_QUERY: &str =
    "SELECT id, cod_fiscal, denumire, numar_de_inregistrare_in_registrul_comertului,
            an_infiintare, adresa_sediu_social, cod_postal, adresa_puncte_de_lucru,
            iban, telefon, email, cod_caen_principal, coduri_caen_secundare,
            numar_angajati, capital_social::float8 AS capital_social,
            stare::text AS stare,
            wallet, created_at, updated_at
     FROM persoana_juridica";

const FIND_PERSOANA_JURIDICA_BY_ID: &str =
    "SELECT id, cod_fiscal, denumire, numar_de_inregistrare_in_registrul_comertului,
            an_infiintare, adresa_sediu_social, cod_postal, adresa_puncte_de_lucru,
            iban, telefon, email, cod_caen_principal, coduri_caen_secundare,
            numar_angajati, capital_social::float8 AS capital_social,
            stare::text AS stare,
            wallet, created_at, updated_at
     FROM persoana_juridica WHERE id = $1";

const CREATE_PERSOANA_JURIDICA_QUERY: &str = "
    INSERT INTO persoana_juridica (
        id, cod_fiscal, denumire, numar_de_inregistrare_in_registrul_comertului,
        an_infiintare, adresa_sediu_social, cod_postal, adresa_puncte_de_lucru,
        iban, telefon, email, cod_caen_principal, coduri_caen_secundare,
        numar_angajati, capital_social::float8 AS capital_social, stare, wallet
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16::stare_persoana_juridica, $17
    )
    RETURNING id, cod_fiscal, denumire, numar_de_inregistrare_in_registrul_comertului,
              an_infiintare, adresa_sediu_social, cod_postal, adresa_puncte_de_lucru,
              iban, telefon, email, cod_caen_principal, coduri_caen_secundare,
              numar_angajati, capital_social::float8 AS capital_social,
              stare::text AS stare,
              wallet, created_at, updated_at";

const UPDATE_PERSOANA_JURIDICA_QUERY: &str = "
    UPDATE persoana_juridica SET
        cod_fiscal = $1, denumire = $2,
        numar_de_inregistrare_in_registrul_comertului = $3,
        an_infiintare = $4, adresa_sediu_social = $5,
        cod_postal = $6, adresa_puncte_de_lucru = $7,
        iban = $8, telefon = $9, email = $10,
        cod_caen_principal = $11, coduri_caen_secundare = $12,
        numar_angajati = $13, capital_social = $14,
        stare = $15::stare_persoana_juridica,
        wallet = $16, updated_at = NOW()
    WHERE id = $17
    RETURNING id, cod_fiscal, denumire, numar_de_inregistrare_in_registrul_comertului,
              an_infiintare, adresa_sediu_social, cod_postal, adresa_puncte_de_lucru,
              iban, telefon, email, cod_caen_principal, coduri_caen_secundare,
              numar_angajati, capital_social::float8 AS capital_social,
              stare::text AS stare,
              wallet, created_at, updated_at";

const DELETE_PERSOANA_JURIDICA_QUERY: &str = "DELETE FROM persoana_juridica WHERE id = $1";

#[async_trait]
pub trait PersoanaJuridicaRepository: Send + Sync {
    async fn find_all(&self) -> Result<Vec<PersoanaJuridica>, Error>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<PersoanaJuridica>, Error>;
    async fn create(&self, persoana: PersoanaJuridica) -> Result<PersoanaJuridica, Error>;
    async fn update(&self, persoana: PersoanaJuridica) -> Result<PersoanaJuridica, Error>;
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
    cod_postal: Option<String>,
    adresa_puncte_de_lucru: Option<Vec<String>>,
    iban: String,
    telefon: Option<String>,
    email: Option<String>,
    cod_caen_principal: String,
    coduri_caen_secundare: Option<Vec<String>>,
    numar_angajati: i32,
    capital_social: f64,
    stare: String,
    wallet: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

fn row_to_model(row: PersoanaJuridicaRow) -> Result<PersoanaJuridica, sqlx::Error> {
    let stare =
        StarePersoanaJuridica::from_str(&row.stare).map_err(|e| sqlx::Error::ColumnDecode {
            index: "stare".to_string(),
            source: Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, e)),
        })?;

    Ok(PersoanaJuridica {
        id: row.id,
        cod_fiscal: row.cod_fiscal,
        denumire: row.denumire,
        numar_de_inregistrare_in_registrul_comertului: row
            .numar_de_inregistrare_in_registrul_comertului,
        an_infiintare: row.an_infiintare,
        adresa_sediu_social: row.adresa_sediu_social,
        cod_postal: row.cod_postal,
        adresa_puncte_de_lucru: row.adresa_puncte_de_lucru,
        iban: row.iban,
        telefon: row.telefon,
        email: row.email,
        cod_caen_principal: row.cod_caen_principal,
        coduri_caen_secundare: row.coduri_caen_secundare,
        numar_angajati: row.numar_angajati,
        capital_social: row.capital_social,
        stare,
        wallet: row.wallet,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

#[async_trait]
impl PersoanaJuridicaRepository for PgPersoanaJuridicaRepository {
    async fn find_all(&self) -> Result<Vec<PersoanaJuridica>, Error> {
        let rows = sqlx::query_as::<_, PersoanaJuridicaRow>(FIND_ALL_PERSOANE_JURIDICE_QUERY)
            .fetch_all(&self.pool)
            .await?;
        rows.into_iter().map(row_to_model).collect()
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<PersoanaJuridica>, Error> {
        let row = sqlx::query_as::<_, PersoanaJuridicaRow>(FIND_PERSOANA_JURIDICA_BY_ID)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        row.map(row_to_model).transpose()
    }

    async fn create(&self, persoana: PersoanaJuridica) -> Result<PersoanaJuridica, Error> {
        let row = sqlx::query_as::<_, PersoanaJuridicaRow>(CREATE_PERSOANA_JURIDICA_QUERY)
            .bind(persoana.id)
            .bind(persoana.cod_fiscal)
            .bind(persoana.denumire)
            .bind(persoana.numar_de_inregistrare_in_registrul_comertului)
            .bind(persoana.an_infiintare)
            .bind(persoana.adresa_sediu_social)
            .bind(persoana.cod_postal)
            .bind(persoana.adresa_puncte_de_lucru)
            .bind(persoana.iban)
            .bind(persoana.telefon)
            .bind(persoana.email)
            .bind(persoana.cod_caen_principal)
            .bind(persoana.coduri_caen_secundare)
            .bind(persoana.numar_angajati)
            .bind(persoana.capital_social)
            .bind(persoana.stare)
            .bind(persoana.wallet)
            .fetch_one(&self.pool)
            .await?;
        row_to_model(row)
    }

    async fn update(&self, persoana: PersoanaJuridica) -> Result<PersoanaJuridica, Error> {
        let row = sqlx::query_as::<_, PersoanaJuridicaRow>(UPDATE_PERSOANA_JURIDICA_QUERY)
            .bind(persoana.cod_fiscal)
            .bind(persoana.denumire)
            .bind(persoana.numar_de_inregistrare_in_registrul_comertului)
            .bind(persoana.an_infiintare)
            .bind(persoana.adresa_sediu_social)
            .bind(persoana.cod_postal)
            .bind(persoana.adresa_puncte_de_lucru)
            .bind(persoana.iban)
            .bind(persoana.telefon)
            .bind(persoana.email)
            .bind(persoana.cod_caen_principal)
            .bind(persoana.coduri_caen_secundare)
            .bind(persoana.numar_angajati)
            .bind(persoana.capital_social)
            .bind(persoana.stare)
            .bind(persoana.wallet)
            .bind(persoana.id)
            .fetch_one(&self.pool)
            .await?;
        row_to_model(row)
    }

    async fn delete(&self, id: Uuid) -> Result<bool, Error> {
        let result = sqlx::query(DELETE_PERSOANA_JURIDICA_QUERY)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
