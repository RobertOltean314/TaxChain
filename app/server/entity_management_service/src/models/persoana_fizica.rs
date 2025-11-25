use crate::models::common::{
    Address, AdresaResponse, ReprezentantRequest, ReprezentantResponse, StareFiscala, TipDovada,
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::{
    FromRow,
    types::chrono::{DateTime, Utc},
};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PersoanaFizica {
    pub uuid: Uuid,

    pub tip: TipPersoanaFizica,
    pub reprezentant_uuid: Uuid,

    // Identificare
    pub cnp_hash: String,
    pub nume: String,
    pub prenume: String,
    pub serie_act_identitate: String,
    pub numar_act_identitate: String,
    pub data_nasterii: NaiveDate,
    pub cetatenie: String,

    pub adresa_domiciliu_uuid: Uuid,
    pub dovada_drept_folosinta: Option<TipDovada>,

    // Înregistrări fiscale
    pub cod_caen: Option<String>,
    pub data_inregistrarii: Option<NaiveDate>,
    pub euid: Option<String>,
    pub nr_ordine_reg_comert: Option<String>,

    pub platitor_tva: bool,
    pub stare_fiscala: StareFiscala,
    pub inregistrat_in_spv: bool,

    // Pentru Audit
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Validate)]
pub struct PersoanaFizicaRequest {
    pub tip: TipPersoanaFizica,
    #[validate(length(
        min = 13,
        max = 13,
        message = "CNP-ul trebuie să aibă exact 13 caractere"
    ))]
    pub cnp: String,
    #[validate(length(
        min = 3,
        max = 14,
        message = "Numele trebuie să aibă între 3 și 15 caractere"
    ))]
    pub nume: String,
    #[validate(length(
        min = 3,
        max = 14,
        message = "Prenumele trebuie să aibă între 3 și 15 caractere"
    ))]
    pub prenume: String,

    pub serie_act_identitate: String,
    pub numar_act_identitate: String,
    pub data_nasterii: chrono::NaiveDate,
    pub cetatenie: String,

    pub adresa_domiciliu: Address,
    pub dovada_drept_folosinta: Option<TipDovada>,
    pub reprezentant: ReprezentantRequest,

    pub cod_caen: Option<String>,
    pub data_inregistrarii: Option<chrono::NaiveDate>,
    pub euid: Option<String>,
    pub nr_ordine_reg_comert: Option<String>,
    pub platitor_tva: bool,
    pub stare_fiscala: StareFiscala,
    pub inregistrat_in_spv: bool,
}

#[derive(Serialize)]
pub struct PersoanaFizicaResponse {
    pub uuid: Uuid,
    pub tip: String,
    pub nume: String,
    pub prenume: String,
    pub serie_act_identitate: String,
    pub numar_act_identitate: String,
    pub data_nasterii: chrono::NaiveDate,
    pub cetatenie: String,

    pub adresa_domiciliu: AdresaResponse,
    pub reprezentant: ReprezentantResponse,

    pub cod_caen: Option<String>,
    pub platitor_tva: bool,
    pub stare_fiscala: String,
    pub inregistrat_in_spv: bool,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Deserialize, Serialize, Debug, Clone, sqlx::Type)]
#[sqlx(type_name = "tip_persoana_fizica", rename_all = "UPPERCASE")]
pub enum TipPersoanaFizica {
    PFA,
    II,
    IF,
}
