use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, NaiveDate, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use crate::models::{PersoanaFizica, Sex, StarePersoanaFizica};

const FIND_ALL_PERSOANA_FIZICA_QUERY: &str =
    "SELECT id, cnp, nume, prenume, prenume_tata, data_nasterii, sex,
            adresa_domiciliu, cod_postal, iban, telefon, email, stare, wallet,
            created_at, updated_at
     FROM persoana_fizica";

const FIND_PERSOANA_FIZICA_BY_ID_QUERY: &str =
    "SELECT id, cnp, nume, prenume, prenume_tata, data_nasterii, sex,
            adresa_domiciliu, cod_postal, iban, telefon, email, stare, wallet,
            created_at, updated_at
     FROM persoana_fizica WHERE id = $1";

const CREATE_PERSOANA_FIZICA_QUERY: &str = "INSERT INTO persoana_fizica (
        id, cnp, nume, prenume, prenume_tata, data_nasterii, sex,
        adresa_domiciliu, cod_postal, iban, telefon, email, stare, wallet
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    )
    RETURNING *";

const UPDATE_PERSOANA_FIZICA_QUERY: &str = "UPDATE persoana_fizica SET
        cnp = $1,
        nume = $2,
        prenume = $3,
        prenume_tata = $4,
        data_nasterii = $5,
        sex = $6,
        adresa_domiciliu = $7,
        cod_postal = $8,
        iban = $9,
        telefon = $10,
        email = $11,
        stare = $12,
        wallet = $13,
        updated_at = NOW()
    WHERE id = $14
    RETURNING *";

const DELETE_PERSOANA_FIZICA_QUERY: &str = "DELETE FROM persoana_fizica WHERE id = $1";

/// Abstraction over persoana_fizica CRUD operations.
/// Implement this trait with the real DB or a mock for tests.
#[async_trait]
pub trait PersoanaFizicaRepository: Send + Sync {
    async fn find_all(&self) -> Result<Vec<PersoanaFizica>, sqlx::Error>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<PersoanaFizica>, sqlx::Error>;
    async fn create(&self, persoana: PersoanaFizica) -> Result<PersoanaFizica, sqlx::Error>;
    async fn update(&self, persoana: PersoanaFizica) -> Result<PersoanaFizica, sqlx::Error>;
    async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error>;
}

/// Type alias for a heap-allocated, dynamically dispatched repository.
/// Inject this via `web::Data<DynPersoanaFizicaRepository>` in handlers.
pub type DynPersoanaFizicaRepository = Arc<dyn PersoanaFizicaRepository>;

/// PostgreSQL-backed implementation of [`PersoanaFizicaRepository`].
pub struct PgPersoanaFizicaRepository {
    pool: PgPool,
}

impl PgPersoanaFizicaRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

// ---------------------------------------------------------------------------
// Internal row type used for sqlx deserialization.
// ---------------------------------------------------------------------------

#[derive(FromRow)]
struct PersoanaFizicaRow {
    id: Uuid,
    cnp: String,
    nume: String,
    prenume: String,
    prenume_tata: Option<String>,
    data_nasterii: NaiveDate,
    sex: Sex,
    adresa_domiciliu: String,
    cod_postal: Option<String>,
    iban: String,
    telefon: Option<String>,
    email: Option<String>,
    stare: StarePersoanaFizica,
    wallet: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

fn row_to_model(row: PersoanaFizicaRow) -> Result<PersoanaFizica, sqlx::Error> {
    Ok(PersoanaFizica {
        id: row.id,
        cnp: row.cnp,
        nume: row.nume,
        prenume: row.prenume,
        prenume_tata: row.prenume_tata,
        data_nasterii: row.data_nasterii,
        sex: row.sex,
        adresa_domiciliu: row.adresa_domiciliu,
        cod_postal: row.cod_postal,
        iban: row.iban,
        telefon: row.telefon,
        email: row.email,
        stare: row.stare,
        wallet: row.wallet,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

#[async_trait]
impl PersoanaFizicaRepository for PgPersoanaFizicaRepository {
    async fn find_all(&self) -> Result<Vec<PersoanaFizica>, sqlx::Error> {
        let rows = sqlx::query_as::<_, PersoanaFizicaRow>(FIND_ALL_PERSOANA_FIZICA_QUERY)
            .fetch_all(&self.pool)
            .await?;
        rows.into_iter().map(row_to_model).collect()
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<PersoanaFizica>, sqlx::Error> {
        let row = sqlx::query_as::<_, PersoanaFizicaRow>(FIND_PERSOANA_FIZICA_BY_ID_QUERY)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        row.map(row_to_model).transpose()
    }

    async fn create(&self, persoana: PersoanaFizica) -> Result<PersoanaFizica, sqlx::Error> {
        let row = sqlx::query_as::<_, PersoanaFizicaRow>(CREATE_PERSOANA_FIZICA_QUERY)
            .bind(persoana.id)
            .bind(&persoana.cnp)
            .bind(&persoana.nume)
            .bind(&persoana.prenume)
            .bind(&persoana.prenume_tata)
            .bind(persoana.data_nasterii)
            .bind(persoana.sex)
            .bind(&persoana.adresa_domiciliu)
            .bind(&persoana.cod_postal)
            .bind(&persoana.iban)
            .bind(&persoana.telefon)
            .bind(&persoana.email)
            .bind(persoana.stare)
            .bind(&persoana.wallet)
            .fetch_one(&self.pool)
            .await?;
        row_to_model(row)
    }

    async fn update(&self, persoana: PersoanaFizica) -> Result<PersoanaFizica, sqlx::Error> {
        let row = sqlx::query_as::<_, PersoanaFizicaRow>(UPDATE_PERSOANA_FIZICA_QUERY)
            .bind(&persoana.cnp)
            .bind(&persoana.nume)
            .bind(&persoana.prenume)
            .bind(&persoana.prenume_tata)
            .bind(persoana.data_nasterii)
            .bind(persoana.sex)
            .bind(&persoana.adresa_domiciliu)
            .bind(&persoana.cod_postal)
            .bind(&persoana.iban)
            .bind(&persoana.telefon)
            .bind(&persoana.email)
            .bind(persoana.stare)
            .bind(&persoana.wallet)
            .bind(persoana.id)
            .fetch_optional(&self.pool)
            .await?;
        match row {
            Some(row) => row_to_model(row),
            None => Err(sqlx::Error::RowNotFound),
        }
    }

    async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(DELETE_PERSOANA_FIZICA_QUERY)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
