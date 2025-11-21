use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::types::chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Address {
    pub tara: String,
    pub judet: String,
    pub localitate: String,
    pub cod_postal: Option<String>,
    pub strada: String,
    pub numar: String,
    pub bloc: Option<String>,
    pub scara: Option<String>,
    pub etaj: Option<String>,
    pub apartament: Option<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Reprezentant {
    pub uuid: Uuid,

    pub parent_id: Uuid,
    pub parent_type: String,

    pub nume: String,
    pub prenume: String,
    pub cnp: String,
    pub tip_act_identitate: TipActIdentitate,
    pub serie_act_identitate: String,
    pub numar_act_identitate: String,
    pub calitate: CalitateReprezentant,
    pub telefon: String,
    pub email: String,
    pub data_nasterii: NaiveDate,

    pub adresa_domiciliu: Uuid,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Deserialize, Serialize, Debug, Clone, sqlx::Type)]
#[sqlx(type_name = "tip_act_identitate", rename_all = "snake_case")]
pub enum TipActIdentitate {
    CarteIdentitate,
    Pasaport,
    PermisDeConducere,
}

#[derive(Deserialize, Serialize, Debug, Clone, sqlx::Type)]
#[sqlx(type_name = "calitate_reprezentant", rename_all = "snake_case")]
pub enum CalitateReprezentant {
    Proprietar,
    Administrator,
    Mandatar,
    AlteCalitati,
}

#[derive(Deserialize, Serialize, Debug, Clone, sqlx::Type)]
#[sqlx(type_name = "tip_dovada", rename_all = "snake_case")]
pub enum TipDovada {
    ContractDeProprietate,
    ContractDeComodat,
    ContractDeInchiriere,
    AlteTipuri,
}

#[derive(Deserialize, Serialize, Debug, Clone, sqlx::Type)]
#[sqlx(type_name = "stare_fiscala", rename_all = "snake_case")]
pub enum StareFiscala {
    Activ,
    Inactiv,
    Suspendat,
    Radiat,
}

#[derive(Serialize, Deserialize)]
pub struct AdresaResponse {
    pub uuid: Uuid,
    pub tara: String,
    pub judet: String,
    pub localitate: String,
    pub cod_postal: Option<String>,
    pub strada: String,
    pub numar: String,
    pub bloc: Option<String>,
    pub scara: Option<String>,
    pub etaj: Option<String>,
    pub apartament: Option<String>,
    pub detalii: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ReprezentantRequest {
    pub parent_id: Uuid,
    pub parent_type: String,
    pub nume: String,
    pub prenume: String,
    pub cnp: String,
    pub tip_act_identitate: TipActIdentitate,
    pub serie_act_identitate: String,
    pub numar_act_identitate: String,
    pub calitate: CalitateReprezentant,
    pub telefon: String,
    pub email: String,
    pub data_nasterii: NaiveDate,
    pub adresa_domiciliu: Uuid,
}

#[derive(Serialize, Deserialize)]
pub struct ReprezentantResponse {
    pub uuid: Uuid,
    pub nume: String,
    pub prenume: String,
    pub telefon: String,
    pub email: String,
    pub calitate: CalitateReprezentant,
    pub adresa_domiciliu: Uuid,
    pub created_at: DateTime<Utc>,
}
