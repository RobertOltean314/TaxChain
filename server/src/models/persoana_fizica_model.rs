use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Type;
use uuid::Uuid;
use validator::Validate;

use crate::validators::{validate_cnp, validate_cod_postal, validate_iban, validate_telefon};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "stare_persoana_fizica")]

pub enum StarePersoanaFizica {
    Activ,
    Inactiv,
    Suspendat,
}

impl Default for StarePersoanaFizica {
    fn default() -> Self {
        Self::Activ
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
pub enum Sex {
    M,
    F,
}

/// Core domain model for a physical person (individual taxpayer).
/// This struct represents the database entity.
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct PersoanaFizica {
    pub id: Uuid,

    #[validate(custom(function = "validate_cnp"))]
    pub cnp: String,

    #[validate(length(min = 1, max = 50, message = "Nume must be 1-50 characters"))]
    pub nume: String,

    #[validate(length(min = 1, max = 50, message = "Prenume must be 1-50 characters"))]
    pub prenume: String,

    #[validate(length(max = 30, message = "Prenume tata must be max 30 characters"))]
    pub prenume_tata: Option<String>,

    pub data_nasterii: NaiveDate,

    pub sex: Sex,

    #[validate(length(min = 1, max = 200, message = "Adresa must be 1-200 characters"))]
    pub adresa_domiciliu: String,

    #[validate(custom(function = "validate_cod_postal"))]
    pub cod_postal: Option<String>,

    #[validate(custom(function = "validate_iban"))]
    pub iban: String,

    #[validate(custom(function = "validate_telefon"))]
    pub telefon: Option<String>,

    #[validate(email(message = "Invalid email format"))]
    #[validate(length(max = 100, message = "Email must be max 100 characters"))]
    pub email: Option<String>,

    pub stare: StarePersoanaFizica,

    #[validate(length(max = 100, message = "Wallet must be max 100 characters"))]
    pub wallet: String,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request body used for both create and update operations.
#[derive(Debug, Deserialize, Validate)]
pub struct PersoanaFizicaRequest {
    #[validate(custom(function = "validate_cnp"))]
    pub cnp: String,

    #[validate(length(min = 1, max = 50, message = "Nume must be 1-50 characters"))]
    pub nume: String,

    #[validate(length(min = 1, max = 50, message = "Prenume must be 1-50 characters"))]
    pub prenume: String,

    #[validate(length(max = 30, message = "Prenume tata must be max 30 characters"))]
    pub prenume_tata: Option<String>,

    pub data_nasterii: NaiveDate,

    pub sex: Sex,

    #[validate(length(min = 1, max = 200, message = "Adresa must be 1-200 characters"))]
    pub adresa_domiciliu: String,

    #[validate(custom(function = "validate_cod_postal"))]
    pub cod_postal: Option<String>,

    #[validate(custom(function = "validate_iban"))]
    pub iban: String,

    #[validate(custom(function = "validate_telefon"))]
    pub telefon: Option<String>,

    #[validate(email(message = "Invalid email format"))]
    #[validate(length(max = 100, message = "Email must be max 100 characters"))]
    pub email: Option<String>,

    pub stare: Option<StarePersoanaFizica>,

    #[validate(length(max = 100, message = "Wallet must be max 100 characters"))]
    pub wallet: String,
}

impl PersoanaFizica {
    pub fn new(
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
        stare: Option<StarePersoanaFizica>,
        wallet: String,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            cnp,
            nume,
            prenume,
            prenume_tata,
            data_nasterii,
            sex,
            adresa_domiciliu,
            cod_postal,
            iban,
            telefon,
            email,
            stare: stare.unwrap_or_default(),
            wallet,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn from_request(req: PersoanaFizicaRequest) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            cnp: req.cnp.clone(),
            nume: req.nume.clone(),
            prenume: req.prenume.clone(),
            prenume_tata: req.prenume_tata.clone(),
            data_nasterii: req.data_nasterii,
            sex: req.sex,
            adresa_domiciliu: req.adresa_domiciliu.clone(),
            cod_postal: req.cod_postal.clone(),
            iban: req.iban.clone(),
            telefon: req.telefon.clone(),
            email: req.email.clone(),
            stare: req.stare.unwrap_or_default(),
            wallet: req.wallet.clone(),
            created_at: now,
            updated_at: now,
        }
    }

    pub fn update_from_request(existing: &PersoanaFizica, req: &PersoanaFizicaRequest) -> Self {
        let now = Utc::now();
        Self {
            id: existing.id,
            cnp: req.cnp.clone(),
            nume: req.nume.clone(),
            prenume: req.prenume.clone(),
            prenume_tata: req.prenume_tata.clone(),
            data_nasterii: req.data_nasterii,
            sex: req.sex,
            adresa_domiciliu: req.adresa_domiciliu.clone(),
            cod_postal: req.cod_postal.clone(),
            iban: req.iban.clone(),
            telefon: req.telefon.clone(),
            email: req.email.clone(),
            stare: req.stare.unwrap_or(existing.stare),
            wallet: req.wallet.clone(),
            created_at: existing.created_at,
            updated_at: now,
        }
    }
}
