use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Type;
use uuid::Uuid;
use validator::Validate;

use crate::validators::{
    validate_caen, validate_cod_fiscal, validate_cod_postal, validate_iban, validate_nr_reg_com,
    validate_telefon,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "stare_persoana_juridica")]
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

impl StarePersoanaJuridica {
    pub fn as_str(&self) -> &'static str {
        match self {
            StarePersoanaJuridica::Activa => "Activa",
            StarePersoanaJuridica::Radiata => "Radiata",
            StarePersoanaJuridica::InInsolventa => "In insolventa",
            StarePersoanaJuridica::Suspendata => "Suspendata",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "Activa" => Ok(StarePersoanaJuridica::Activa),
            "Radiata" => Ok(StarePersoanaJuridica::Radiata),
            "In insolventa" => Ok(StarePersoanaJuridica::InInsolventa),
            "Suspendata" => Ok(StarePersoanaJuridica::Suspendata),
            other => Err(format!("Unknown stare persoana juridica value: '{other}'")),
        }
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
    pub wallet: String,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request body used for both create and update operations.
#[derive(Debug, Deserialize, Validate)]
pub struct PersoanaJuridicaRequest {
    // TODO: Implement validation for those fields
    pub cod_fiscal: String,
    pub denumire: String,
    pub numar_de_inregistrare_in_registrul_comertului: String,
    pub an_infiintare: i32,
    pub adresa_sediu_social: String,
    pub cod_postal: Option<String>,
    pub adresa_puncte_de_lucru: Option<Vec<String>>,
    pub iban: String,
    pub telefon: Option<String>,
    pub email: Option<String>,
    pub cod_caen_principal: String,
    pub coduri_caen_secundare: Option<Vec<String>>,
    pub numar_angajati: i32,
    pub capital_social: f64,
    pub stare: Option<StarePersoanaJuridica>,
    pub wallet: String,
}

impl PersoanaJuridica {
    pub fn new(
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
        stare: Option<StarePersoanaJuridica>,
        wallet: String,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            cod_fiscal,
            denumire,
            numar_de_inregistrare_in_registrul_comertului,
            an_infiintare,
            adresa_sediu_social,
            cod_postal,
            adresa_puncte_de_lucru,
            iban,
            telefon,
            email,
            cod_caen_principal,
            coduri_caen_secundare,
            numar_angajati,
            capital_social,
            stare: stare.unwrap_or_default(),
            wallet,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn from_request(req: PersoanaJuridicaRequest) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            cod_fiscal: req.cod_fiscal.clone(),
            denumire: req.denumire.clone(),
            numar_de_inregistrare_in_registrul_comertului: req
                .numar_de_inregistrare_in_registrul_comertului
                .clone(),
            an_infiintare: req.an_infiintare.clone(),
            adresa_sediu_social: req.adresa_sediu_social.clone(),
            cod_postal: req.cod_postal.clone(),
            adresa_puncte_de_lucru: req.adresa_puncte_de_lucru.clone(),
            iban: req.iban.clone(),
            telefon: req.telefon.clone(),
            email: req.email.clone(),
            cod_caen_principal: req.cod_caen_principal.clone(),
            coduri_caen_secundare: req.coduri_caen_secundare.clone(),
            numar_angajati: req.numar_angajati.clone(),
            capital_social: req.capital_social.clone(),
            stare: req.stare.unwrap_or_default(),
            wallet: req.wallet.clone(),
            created_at: now,
            updated_at: now,
        }
    }

    pub fn update_from_request(existing: &PersoanaJuridica, req: &PersoanaJuridicaRequest) -> Self {
        let now = Utc::now();

        Self {
            id: existing.id,
            cod_fiscal: req.cod_fiscal.clone(),
            denumire: req.denumire.clone(),
            numar_de_inregistrare_in_registrul_comertului: req
                .numar_de_inregistrare_in_registrul_comertului
                .clone(),
            an_infiintare: req.an_infiintare.clone(),
            adresa_sediu_social: req.adresa_sediu_social.clone(),
            cod_postal: req.cod_postal.clone(),
            adresa_puncte_de_lucru: req.adresa_puncte_de_lucru.clone(),
            iban: req.iban.clone(),
            telefon: req.telefon.clone(),
            email: req.email.clone(),
            cod_caen_principal: req.cod_caen_principal.clone(),
            coduri_caen_secundare: req.coduri_caen_secundare.clone(),
            numar_angajati: req.numar_angajati.clone(),
            capital_social: req.capital_social.clone(),
            stare: req.stare.unwrap_or(existing.stare),
            wallet: req.wallet.clone(),
            created_at: existing.created_at,
            updated_at: now,
        }
    }
}
