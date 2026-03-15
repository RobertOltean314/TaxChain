use std::io;
use std::sync::Arc;

use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::partner_model::{EntityType, Partner, PartnerType};

const SELECT_COLS: &str = "
    SELECT id, denumire, cod_fiscal, numar_in_registrul_comertului,
           tip::text AS tip,
           tip_entitate::text AS tip_entitate,
           adresa, cod_postal, oras, tara,
           email, telefon, iban,
           persoana_fizica_id, persoana_juridica_id,
           created_by, created_at, updated_at
    FROM partener
";

const CREATE_QUERY: &str = "
    INSERT INTO partener
        (id, denumire, cod_fiscal, numar_in_registrul_comertului,
         tip, tip_entitate,
         adresa, cod_postal, oras, tara,
         email, telefon, iban,
         persoana_fizica_id, persoana_juridica_id,
         created_by, created_at, updated_at)
    VALUES ($1,$2,$3,$4,
            $5::tip_partener, $6::tip_entitate,
            $7,$8,$9,$10,
            $11,$12,$13,
            $14,$15,
            $16,$17,$18)
    RETURNING id, denumire, cod_fiscal, numar_in_registrul_comertului,
              tip::text AS tip,
              tip_entitate::text AS tip_entitate,
              adresa, cod_postal, oras, tara,
              email, telefon, iban,
              persoana_fizica_id, persoana_juridica_id,
              created_by, created_at, updated_at
";

const UPDATE_QUERY: &str = "
    UPDATE partener
    SET denumire=$1, cod_fiscal=$2, numar_in_registrul_comertului=$3,
        tip=$4::tip_partener, tip_entitate=$5::tip_entitate,
        adresa=$6, cod_postal=$7, oras=$8, tara=$9,
        email=$10, telefon=$11, iban=$12,
        persoana_fizica_id=$13, persoana_juridica_id=$14,
        updated_at=$15
    WHERE id=$16 AND created_by=$17
    RETURNING id, denumire, cod_fiscal, numar_in_registrul_comertului,
              tip::text AS tip,
              tip_entitate::text AS tip_entitate,
              adresa, cod_postal, oras, tara,
              email, telefon, iban,
              persoana_fizica_id, persoana_juridica_id,
              created_by, created_at, updated_at
";

const DELETE_QUERY: &str = "DELETE FROM partener WHERE id=$1 AND created_by=$2";

#[derive(sqlx::FromRow)]
struct PartnerRow {
    id: Uuid,
    denumire: String,
    cod_fiscal: Option<String>,
    numar_in_registrul_comertului: Option<String>,
    tip: String,
    tip_entitate: String,
    adresa: Option<String>,
    cod_postal: Option<String>,
    oras: Option<String>,
    tara: String,
    email: Option<String>,
    telefon: Option<String>,
    iban: Option<String>,
    persoana_fizica_id: Option<Uuid>,
    persoana_juridica_id: Option<Uuid>,
    created_by: Uuid,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

fn decode_error(msg: String) -> sqlx::Error {
    sqlx::Error::Decode(Box::new(io::Error::new(io::ErrorKind::InvalidData, msg)))
}

fn row_to_model(row: PartnerRow) -> Result<Partner, sqlx::Error> {
    let tip = match row.tip.as_str() {
        "Client" => PartnerType::Client,
        "Furnizor" => PartnerType::Furnizor,
        "Ambele" => PartnerType::Ambele,
        other => return Err(decode_error(format!("Invalid tip_partener: {other}"))),
    };
    let tip_entitate = match row.tip_entitate.as_str() {
        "PersoanaFizica" => EntityType::PersoanaFizica,
        "PersoanaJuridica" => EntityType::PersoanaJuridica,
        other => return Err(decode_error(format!("Invalid tip_entitate: {other}"))),
    };
    Ok(Partner {
        id: row.id,
        denumire: row.denumire,
        cod_fiscal: row.cod_fiscal,
        numar_in_registrul_comertului: row.numar_in_registrul_comertului,
        tip,
        tip_entitate,
        adresa: row.adresa,
        cod_postal: row.cod_postal,
        oras: row.oras,
        tara: row.tara,
        email: row.email,
        telefon: row.telefon,
        iban: row.iban,
        persoana_fizica_id: row.persoana_fizica_id,
        persoana_juridica_id: row.persoana_juridica_id,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

fn tip_partener_str(t: PartnerType) -> &'static str {
    match t {
        PartnerType::Client => "Client",
        PartnerType::Furnizor => "Furnizor",
        PartnerType::Ambele => "Ambele",
    }
}

fn tip_entitate_str(t: EntityType) -> &'static str {
    match t {
        EntityType::PersoanaFizica => "PersoanaFizica",
        EntityType::PersoanaJuridica => "PersoanaJuridica",
    }
}

#[async_trait]
pub trait PartnerRepository: Send + Sync {
    async fn find_all_for_user(&self, user_id: Uuid) -> Result<Vec<Partner>, sqlx::Error>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Partner>, sqlx::Error>;
    async fn create(&self, partner: Partner) -> Result<Partner, sqlx::Error>;
    async fn update(
        &self,
        id: Uuid,
        partner: Partner,
        user_id: Uuid,
    ) -> Result<Option<Partner>, sqlx::Error>;
    async fn delete(&self, id: Uuid, user_id: Uuid) -> Result<bool, sqlx::Error>;
}

pub type DynPartnerRepository = Arc<dyn PartnerRepository>;

pub struct PgPartnerRepository {
    pool: PgPool,
}

impl PgPartnerRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl PartnerRepository for PgPartnerRepository {
    async fn find_all_for_user(&self, user_id: Uuid) -> Result<Vec<Partner>, sqlx::Error> {
        let rows = sqlx::query_as::<_, PartnerRow>(&format!(
            "{SELECT_COLS} WHERE created_by = $1 ORDER BY denumire ASC"
        ))
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_model).collect()
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Partner>, sqlx::Error> {
        let row = sqlx::query_as::<_, PartnerRow>(&format!("{SELECT_COLS} WHERE id = $1"))
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        row.map(row_to_model).transpose()
    }

    async fn create(&self, p: Partner) -> Result<Partner, sqlx::Error> {
        let row = sqlx::query_as::<_, PartnerRow>(CREATE_QUERY)
            .bind(p.id)
            .bind(&p.denumire)
            .bind(&p.cod_fiscal)
            .bind(&p.numar_in_registrul_comertului)
            .bind(tip_partener_str(p.tip))
            .bind(tip_entitate_str(p.tip_entitate))
            .bind(&p.adresa)
            .bind(&p.cod_postal)
            .bind(&p.oras)
            .bind(&p.tara)
            .bind(&p.email)
            .bind(&p.telefon)
            .bind(&p.iban)
            .bind(p.persoana_fizica_id)
            .bind(p.persoana_juridica_id)
            .bind(p.created_by)
            .bind(p.created_at)
            .bind(p.updated_at)
            .fetch_one(&self.pool)
            .await?;

        row_to_model(row)
    }

    async fn update(
        &self,
        _id: Uuid,
        p: Partner,
        user_id: Uuid,
    ) -> Result<Option<Partner>, sqlx::Error> {
        let row = sqlx::query_as::<_, PartnerRow>(UPDATE_QUERY)
            .bind(&p.denumire)
            .bind(&p.cod_fiscal)
            .bind(&p.numar_in_registrul_comertului)
            .bind(tip_partener_str(p.tip))
            .bind(tip_entitate_str(p.tip_entitate))
            .bind(&p.adresa)
            .bind(&p.cod_postal)
            .bind(&p.oras)
            .bind(&p.tara)
            .bind(&p.email)
            .bind(&p.telefon)
            .bind(&p.iban)
            .bind(p.persoana_fizica_id)
            .bind(p.persoana_juridica_id)
            .bind(p.updated_at)
            .bind(p.id)
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await?;

        row.map(row_to_model).transpose()
    }

    async fn delete(&self, id: Uuid, user_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(DELETE_QUERY)
            .bind(id)
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}
