use chrono::{DateTime, NaiveDate, Utc};
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

lazy_static! {
    static ref CNP_REGEX: Regex = Regex::new(r"^[0-9]+$").unwrap();
    static ref IBAN_REGEX: Regex = Regex::new(r"^[A-Z0-9]+$").unwrap();
    static ref TELEFON_REGEX: Regex = Regex::new(r"^[0-9]+$").unwrap();
}

#[derive(Debug, Serialize, Deserialize)]
pub enum StarePersoanaFizica {
    Activ,
    Inactiv,
    Suspendat,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct PersoanaFizica {
    pub id: Uuid,

    #[validate(length(equal = 13))]
    #[validate(regex(path = "*CNP_REGEX"))]
    pub cnp: String,

    #[validate(length(min = 1, max = 50))]
    pub nume: String,

    #[validate(length(min = 1, max = 50))]
    pub prenume: String,

    #[validate(length(max = 30))]
    pub prenume_tata: Option<String>,

    pub data_nasterii: NaiveDate,

    #[validate(length(equal = 1))]
    #[validate(custom(function = "validate_sex"))]
    pub sex: String,

    #[validate(length(min = 1, max = 200))]
    pub adresa_domiciliu: String,

    #[validate(length(equal = 6))]
    pub cod_postal: Option<String>,

    #[validate(length(min = 15, max = 34))]
    #[validate(regex(path = "*IBAN_REGEX"))]
    pub iban: String,

    #[validate(length(max = 15))]
    #[validate(regex(path = "*TELEFON_REGEX"))]
    pub telefon: Option<String>,

    #[validate(length(max = 100))]
    #[validate(email)]
    pub email: Option<String>,

    pub stare: StarePersoanaFizica,

    #[validate(length(max = 100))]
    pub wallet: Option<String>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Custom validator for sex field
fn validate_sex(sex: &str) -> Result<(), validator::ValidationError> {
    if sex == "M" || sex == "F" {
        Ok(())
    } else {
        Err(validator::ValidationError::new("invalid_sex"))
    }
}
