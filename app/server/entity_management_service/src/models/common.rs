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
    pub nume: String,
    pub prenume: String,
    pub cnp: String,
    pub tip_act_identitate: TipActIdentitate,
    pub serie_act_identitate: String,
    pub numar_act_identitate: String,
    pub calitate: CalitateReprezentant,
    pub telefon: String,
    pub email: String,
    pub data_nasterii: DateTime<Utc>,
    pub adresa_domiciliu: Address,
}

#[derive(Deserialize, Serialize, Debug, Clone, sqlx::Type)]
pub enum TipActIdentitate {
    CarteIdentitate,
    Pasaport,
    PermisDeConducere,
}

#[derive(Deserialize, Serialize, Debug, Clone, sqlx::Type)]
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
#[sqlx(type_name = "tip_dovada", rename_all = "snake_case")]
pub enum StareFiscala {
    Activ,
    Inactiv,
    Suspendat,
    Radiat,
}

#[derive(Serialize)]
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

#[derive(Serialize)]
pub struct ReprezentantResponse {
    pub uuid: Uuid,
    pub nume: String,
    pub prenume: String,
    pub email: String,
    pub telefon: String,
    pub calitate: String,
}
