use serde::{Deserialize, Serialize};
use sqlx::types::chrono::{DateTime, Utc};

#[derive(Deserialize, Serialize)]
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

#[derive(Deserialize, Serialize)]
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

#[derive(Deserialize, Serialize)]
pub enum TipActIdentitate {
    CarteIdentitate,
    Pasaport,
    PermisDeConducere,
}

#[derive(Deserialize, Serialize)]
pub enum CalitateReprezentant {
    Proprietar,
    Administrator,
    Mandatar,
    AlteCalitati(String),
}

#[derive(Deserialize, Serialize)]
pub enum TipDovada {
    ContractDeProprietate,
    ContractDeComodat,
    ContractDeInchiriere,
    AlteTipuri(String),
}

#[derive(Deserialize, Serialize)]
pub enum StareFiscala {
    Activ,
    Inactiv,
    Suspendat,
    Radiat,
}
