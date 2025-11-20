use crate::models::common::{Address, Reprezentant, StareFiscala, TipDovada};
use serde::{Deserialize, Serialize};
use sqlx::types::chrono::{DateTime, Utc};

#[derive(Deserialize, Serialize)]
pub struct PersoanaFizica {
    pub tip: TipPersoanaFizica,
    pub reprezentant: Reprezentant,
    pub cnp: String, // aici ar trebui sa salvam hash-ul cnp-ului
    pub nume: String,
    pub prenume: String,
    pub serie_act_identitate: String,
    pub numar_act_identitate: String,
    pub data_nasterii: DateTime<Utc>,
    pub cetatenie: String,
    pub adresa_domiciliu: Address,
    pub dovada_drept_folosinta: TipDovada,

    pub cod_caen: String,
    pub data_inregistrarii: DateTime<Utc>,
    pub euid: Option<String>,
    pub nr_ordine_reg_comert: Option<String>,
    pub platitor_tva: bool,
    pub stare_fiscala: StareFiscala,
    pub inregistrat_in_spv: bool,
}

#[derive(Deserialize, Serialize)]
pub enum TipPersoanaFizica {
    PFA,
    II,
    IF,
}
