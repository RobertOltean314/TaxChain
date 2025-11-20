use sqlx::types::chrono::{DateTime, Utc};
pub struct Adress {
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
    pub adresa_domiciliu: Adress,
}

pub enum TipActIdentitate {
    CarteIdentitate,
    Pasaport,
    PermisDeConducere,
}

pub enum CalitateReprezentant {
    Proprietar,
    Administrator,
    Mandatar,
    AlteCalitati(String),
}

pub enum TipDovada {
    ContractDeProprietate,
    ContractDeComodat,
    ContractDeInchiriere,
    AlteTipuri(String),
}

pub enum StareFiscala {
    Activ,
    Inactiv,
    Suspendat,
    Radiat,
}
