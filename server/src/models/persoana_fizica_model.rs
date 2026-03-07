use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::validators::{validate_cnp, validate_cod_postal, validate_iban, validate_telefon};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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
    pub wallet: Option<String>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
