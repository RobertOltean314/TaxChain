use crate::models::common::{Adress, Reprezentant, StareFiscala, TipDovada};
use sqlx::types::chrono::{DateTime, Utc};

pub struct PersoanaFizica {
    pub tip: TipPersoanaFizica,
    pub reprezentant: Reprezentant,
    pub cnp: String,
    pub nume: String,
    pub prenume: String,
    pub serie_act_identitate: String,
    pub numar_act_identitate: String,
    pub data_nasterii: DateTime<Utc>,
    pub cetatenie: String,
    pub adresa_domiciliu: Adress,
    pub dovada_drept_folosinta: TipDovada,
    //
    pub cod_caen: String,
    pub data_inregistrarii: DateTime<Utc>,
    pub euid: Option<String>,
    pub nr_ordine_reg_comert: Option<String>,
    pub platitor_tva: bool,
    pub stare_fiscala: StareFiscala,
    pub inregistrat_in_spv: bool,
}

pub enum TipPersoanaFizica {
    PFA,
    II,
    IF,
}
