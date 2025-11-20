use actix_web::{HttpResponse, get, web};
use chrono::{DateTime, Utc};
use sqlx::types::{Uuid, chrono};

use crate::models::{
    PersoanaFizica,
    common::{
        Address, CalitateReprezentant, Reprezentant, StareFiscala, TipActIdentitate, TipDovada,
    },
    persoana_fizica::TipPersoanaFizica,
};

#[get("/api/persoana_fizica/{id}")]
pub async fn get_persoana_fizica_test(path: web::Path<Uuid>) -> HttpResponse {
    let _id = path.into_inner();

    let persoana_test = PersoanaFizica {
        tip: TipPersoanaFizica::PFA,

        reprezentant: Reprezentant {
            cnp: "0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08".to_string(),
            nume: "Popescu".to_string(),
            prenume: "Maria".to_string(),
            tip_act_identitate: TipActIdentitate::CarteIdentitate,
            serie_act_identitate: "CJ".to_string(),
            numar_act_identitate: "876543".to_string(),
            calitate: CalitateReprezentant::Administrator,
            telefon: "+40740123456".to_string(),
            email: "maria.popescu@pfa.ro".to_string(),
            data_nasterii: DateTime::parse_from_rfc3339("1985-02-10T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            adresa_domiciliu: Address {
                tara: "România".to_string(),
                judet: "Cluj".to_string(),
                localitate: "Cluj-Napoca".to_string(),
                cod_postal: Some("400267".to_string()),
                strada: "Piața Unirii".to_string(),
                numar: "5".to_string(),
                bloc: Some("B2".to_string()),
                scara: Some("A".to_string()),
                etaj: Some("3".to_string()),
                apartament: Some("12".to_string()),
            },
        },

        cnp: "0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08".to_string(), // hash keccak256

        nume: "Popescu".to_string(),
        prenume: "Ion".to_string(),

        serie_act_identitate: "CJ".to_string(),
        numar_act_identitate: "765432".to_string(),

        data_nasterii: DateTime::parse_from_rfc3339("1980-07-15T00:00:00Z")
            .unwrap()
            .with_timezone(&Utc),

        cetatenie: "Română".to_string(),

        adresa_domiciliu: Address {
            tara: "România".to_string(),
            judet: "Cluj".to_string(),
            localitate: "Cluj-Napoca".to_string(),
            cod_postal: Some("400604".to_string()),
            strada: "Memorandumului".to_string(),
            numar: "28".to_string(),
            bloc: None,
            scara: None,
            etaj: Some("2".to_string()),
            apartament: Some("7".to_string()),
        },

        dovada_drept_folosinta: TipDovada::ContractDeInchiriere,

        cod_caen: "6201".to_string(), // Programare IT – cea mai frecventă la PFA Cluj 😄

        data_inregistrarii: DateTime::parse_from_rfc3339("2023-03-10T10:30:00Z")
            .unwrap()
            .with_timezone(&Utc),

        euid: Some("ROONRC.F40/567/2023".to_string()),
        nr_ordine_reg_comert: Some("F40/567/2023".to_string()),

        platitor_tva: true,
        stare_fiscala: StareFiscala::Activ,
        inregistrat_in_spv: true,
    };

    HttpResponse::Ok().json(persoana_test)
}
