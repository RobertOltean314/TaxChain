use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PartnerType {
    Furnizor,
    Client,
    Ambele,
}

impl Default for PartnerType {
    fn default() -> Self {
        Self::Ambele
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EntityType {
    PersoanaJuridica,
    PersoanaFizica,
}

impl Default for EntityType {
    fn default() -> Self {
        Self::PersoanaJuridica
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Partner {
    pub id: Uuid,

    pub denumire: String,
    pub cod_fiscal: Option<String>,
    pub numar_in_registrul_comertului: Option<String>,

    pub tip: PartnerType,
    pub tip_entitate: EntityType,

    pub adresa: Option<String>,
    pub cod_postal: Option<String>,
    pub oras: Option<String>,
    pub tara: String,
    pub email: Option<String>,
    pub telefon: Option<String>,
    pub iban: Option<String>,

    pub persoana_fizica_id: Option<Uuid>,
    pub persoana_juridica_id: Option<Uuid>,

    pub created_by: Uuid,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct PartnerRequest {
    #[validate(length(min = 1, max = 200, message = "Denumire must be 1-200 characters"))]
    pub denumire: String,

    #[validate(length(max = 20, message = "Cod fiscal max 20 characters"))]
    pub cod_fiscal: Option<String>,

    #[validate(length(max = 20, message = "Nr. reg. com. max 20 characters"))]
    pub numar_in_registrul_comertului: Option<String>,

    pub tip: Option<PartnerType>,
    pub tip_entitate: Option<EntityType>,

    #[validate(length(max = 300, message = "Adresa max 300 characters"))]
    pub adresa: Option<String>,

    #[validate(length(max = 6, message = "Cod postal max 6 characters"))]
    pub cod_postal: Option<String>,

    #[validate(length(max = 100, message = "Oras max 100 characters"))]
    pub oras: Option<String>,

    #[validate(length(min = 1, max = 100, message = "Tara must be 1-100 characters"))]
    pub tara: Option<String>,

    #[validate(email(message = "Invalid email format"))]
    pub email: Option<String>,

    #[validate(length(max = 20, message = "Telefon max 20 characters"))]
    pub telefon: Option<String>,

    #[validate(length(max = 34, message = "IBAN max 34 characters"))]
    pub iban: Option<String>,

    pub persoana_fizica_id: Option<Uuid>,
    pub persoana_juridica_id: Option<Uuid>,
}

impl Partner {
    pub fn from_request(req: PartnerRequest, created_by: Uuid) -> Self {
        let now = Utc::now();

        Self {
            id: Uuid::new_v4(),
            denumire: req.denumire,
            cod_fiscal: req.cod_fiscal,
            numar_in_registrul_comertului: req.numar_in_registrul_comertului,
            tip: req.tip.unwrap_or_default(),
            tip_entitate: req.tip_entitate.unwrap_or_default(),
            adresa: req.adresa,
            cod_postal: req.cod_postal,
            oras: req.oras,
            tara: req.tara.unwrap_or_else(|| "Romania".to_string()),
            email: req.email,
            telefon: req.telefon,
            iban: req.iban,
            persoana_fizica_id: req.persoana_fizica_id,
            persoana_juridica_id: req.persoana_juridica_id,
            created_by,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn update_from_request(existing: &Partner, req: PartnerRequest) -> Self {
        let now = Utc::now();

        Self {
            id: existing.id,
            denumire: req.denumire,
            cod_fiscal: req.cod_fiscal,
            numar_in_registrul_comertului: req.numar_in_registrul_comertului,
            tip: req.tip.unwrap_or(existing.tip),
            tip_entitate: req.tip_entitate.unwrap_or(existing.tip_entitate),
            adresa: req.adresa,
            cod_postal: req.cod_postal,
            oras: req.oras,
            tara: req.tara.unwrap_or_else(|| existing.tara.clone()),
            email: req.email,
            telefon: req.telefon,
            iban: req.iban,
            persoana_fizica_id: req.persoana_fizica_id,
            persoana_juridica_id: req.persoana_juridica_id,
            created_by: existing.created_by,
            created_at: existing.created_at,
            updated_at: now,
        }
    }
}
