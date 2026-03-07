use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::validators::{
    validate_caen, validate_cod_fiscal, validate_cod_postal, validate_iban, validate_nr_reg_com,
    validate_telefon,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StarePersoanaJuridica {
    Activa,
    Suspendata,
    Radiata,
    InInsolventa,
}

impl Default for StarePersoanaJuridica {
    fn default() -> Self {
        Self::Activa
    }
}

/// Core domain model for a businesses.
/// This struct represents the database entity.
#[derive(Debug, Serialize, Deserialize, Clone, Validate)]
pub struct PersoanaJuridica {
    pub id: Uuid,

    #[validate(custom(function = "validate_cod_fiscal"))]
    pub cod_fiscal: String,

    #[validate(length(min = 1, max = 200, message = "Denumire must be 1-200 characters"))]
    pub denumire: String,

    #[validate(custom(function = "validate_nr_reg_com"))]
    pub numar_de_inregistrare_in_registrul_comertului: String,

    #[validate(range(min = 1800, max = 2100, message = "An infiintare must be valid year"))]
    pub an_infiintare: i32,

    #[validate(length(min = 1, max = 200, message = "Adresa must be 1-200 characters"))]
    pub adresa_sediu_social: String,

    #[validate(custom(function = "validate_cod_postal"))]
    pub cod_postal: Option<String>,

    pub adresa_puncte_de_lucru: Option<Vec<String>>,

    #[validate(custom(function = "validate_iban"))]
    pub iban: String,

    #[validate(custom(function = "validate_telefon"))]
    pub telefon: Option<String>,

    #[validate(email(message = "Invalid email format"))]
    #[validate(length(max = 100, message = "Email must be max 100 characters"))]
    pub email: Option<String>,

    #[validate(custom(function = "validate_caen"))]
    pub cod_caen_principal: String,

    pub coduri_caen_secundare: Option<Vec<String>>,

    #[validate(range(min = 0, message = "Number of employees cannot be negative"))]
    pub numar_angajati: i32,

    #[validate(range(min = 1.0, message = "Capital social must be at least 1 RON"))]
    pub capital_social: f64,

    pub stare: StarePersoanaJuridica,

    #[validate(length(max = 100, message = "Wallet must be max 100 characters"))]
    pub wallet: Option<String>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
