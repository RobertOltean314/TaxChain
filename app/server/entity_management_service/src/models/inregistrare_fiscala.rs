use crate::models::{EntitateStraina, InstitutiePublica, Ong, PersoanaFizica, PersoanaJuridica};

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
