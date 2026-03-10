use chrono::{DateTime, NaiveDate};
use taxchain::models::{PersoanaFizica, Sex, StarePersoanaFizica};
use uuid::{Uuid, uuid};

pub const POPESCU_ID: Uuid = uuid!("550e8400-e29b-41d4-a716-446655440000");
pub const IONESCU_ID: Uuid = uuid!("550e8400-e29b-41d4-a716-446655440001");
pub const GEORGESCU_ID: Uuid = uuid!("550e8400-e29b-41d4-a716-446655440002");

pub fn mock_persoana_fizica() -> Vec<PersoanaFizica> {
    vec![
        PersoanaFizica {
            id: POPESCU_ID,
            cnp: "1960523123456".to_string(),
            nume: "Popescu".to_string(),
            prenume: "Ion".to_string(),
            prenume_tata: Some("Gheorghe".to_string()),
            data_nasterii: NaiveDate::from_ymd_opt(1996, 5, 23).unwrap(),
            sex: Sex::M,
            adresa_domiciliu: "Str. Mihai Viteazu 12, Sibiu".to_string(),
            cod_postal: Some("550123".to_string()),
            iban: "RO49AAAA1B31007593840000".to_string(),
            telefon: Some("+40740111222".to_string()),
            email: Some("ion.popescu@example.com".to_string()),
            stare: StarePersoanaFizica::Activ,
            wallet: "erd1qyu5wthldmockwalletaddress0001".to_string(),
            created_at: DateTime::from_timestamp(0, 0).unwrap(),
            updated_at: DateTime::from_timestamp(0, 0).unwrap(),
        },
        PersoanaFizica {
            id: IONESCU_ID,
            cnp: "2920815123457".to_string(),
            nume: "Ionescu".to_string(),
            prenume: "Maria".to_string(),
            prenume_tata: Some("Vasile".to_string()),
            data_nasterii: NaiveDate::from_ymd_opt(1992, 5, 15).unwrap(),
            sex: Sex::F,
            adresa_domiciliu: "Str. Calea Dumbravii 45, Sibiu".to_string(),
            cod_postal: Some("550324".to_string()),
            iban: "RO66BBBB1B31007593840001".to_string(),
            telefon: Some("+40745555666".to_string()),
            email: Some("maria.ionescu@example.com".to_string()),
            stare: StarePersoanaFizica::Activ,
            wallet: "erd1kz8m8mockwalletaddress0002".to_string(),
            created_at: DateTime::from_timestamp(0, 0).unwrap(),
            updated_at: DateTime::from_timestamp(0, 0).unwrap(),
        },
        PersoanaFizica {
            id: GEORGESCU_ID,
            cnp: "5011129123458".to_string(),
            nume: "Georgescu".to_string(),
            prenume: "Andrei".to_string(),
            prenume_tata: Some("Nicolae".to_string()),
            data_nasterii: NaiveDate::from_ymd_opt(2001, 11, 29).unwrap(),
            sex: Sex::M,
            adresa_domiciliu: "Bd. Victoriei 78, Brasov".to_string(),
            cod_postal: Some("500045".to_string()),
            iban: "RO21CCCC1B31007593840002".to_string(),
            telefon: Some("+40749999888".to_string()),
            email: Some("andrei.georgescu@example.com".to_string()),
            stare: StarePersoanaFizica::Inactiv,
            wallet: "erd1l9d2mockwalletaddress0003".to_string(),
            created_at: DateTime::from_timestamp(0, 0).unwrap(),
            updated_at: DateTime::from_timestamp(0, 0).unwrap(),
        },
    ]
}
