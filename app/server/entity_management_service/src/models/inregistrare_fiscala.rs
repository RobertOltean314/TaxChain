use crate::models::{EntitateStraina, InstitutiePublica, Ong, PersoanaFizica, PersoanaJuridica};
use chrono::NaiveDate;

pub struct InregistrareFiscala {
    contribuabil: Contribuabil,
    obligatii: ObligatiiFiscale,
}

pub enum Contribuabil {
    PersoanaFizica(PersoanaFizica),
    PersoanaJuridica(PersoanaJuridica),
    Ong(Ong),
    InstitutiePublica(InstitutiePublica),
    EntitateStraina(EntitateStraina),
    Other(String),
}

pub struct ObligatiiFiscale {
    impozit_pe_venit: bool,
    cas: bool,
    cass: bool,
    tva: bool,
    alte_obligatii: String,
}

// To take a closer look on this one
pub struct PersoanaFizicaConformANAF {
    pub denumire_platitor: String,
    pub adresa: String,
    pub judetul: String,
    pub nr_inmatriculare_reg_comert: String,
    pub act_autorizare: Option<String>,
    pub cod_postal: Option<String>,
    pub telefon: Option<String>,
    pub fax: Option<String>,
    pub stare_societate: String,
    pub data_inregistrare_societate: Option<NaiveDate>,
    pub observatii: Option<String>,
    pub data_inregistrarii_ultimei_declaratii: Option<NaiveDate>,
    pub data_ultimei_prelucari: Option<NaiveDate>,
    pub impozit_pe_profit: Option<NaiveDate>,
    pub impozit_pe_venituri_micro: bool,
    pub accize: bool,
    pub tva: bool,
    pub contributii_asigurari_sociale: bool,
    pub contributie_asiguratorie_munca: bool,
    pub contributie_asigurari_sanatate: bool,
    pub taxa_jocuri_noroc: bool,
    pub impozit_pe_venituri_salariale: bool,
    pub impozit_pe_constructii: Option<NaiveDate>,
    pub impozit_titei_gaze_naturale: bool,
    pub redevente_miniere_concesiuni_inchirieri: bool,
    pub redevente_petroliere: bool,
}
