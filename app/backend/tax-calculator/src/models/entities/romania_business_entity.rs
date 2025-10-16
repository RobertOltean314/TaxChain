use serde::{Deserialize, Serialize};

use crate::models::{entities::business_entity::BusinessEntity, CountryCode};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RomanianBusinessEntity {
    pub nume: String,
    pub cui: String,
    pub registru_comert: Option<String>,
    pub cod_tara: CountryCode,
    pub adresa: String,
    pub judet: Option<String>,
    pub localitate: Option<String>,
    pub cod_postal: Option<String>,
    pub telefon: Option<String>,
    pub email: Option<String>,
    pub iban: Option<String>,
    pub banca: Option<String>,
    pub platitor_tva: bool,
}

impl BusinessEntity for RomanianBusinessEntity {
    fn get_name(&self) -> &str {
        &self.nume
    }
    fn get_address(&self) -> &str {
        &self.adresa
    }

    fn get_tax_id(&self) -> &str {
        &self.cui
    }

    fn get_country_code(&self) -> &CountryCode {
        &self.cod_tara
    }
}

// Default test business
impl Default for RomanianBusinessEntity {
    fn default() -> Self {
        Self {
            nume: "Test Company SRL".to_string(),
            cui: "RO12345678".to_string(),
            registru_comert: Some("J40/1234/2024".to_string()),
            adresa: "Str. Test Nr. 1, Sector 1, București".to_string(),
            cod_tara: CountryCode::RO,
            judet: Some("București".to_string()),
            localitate: Some("București".to_string()),
            cod_postal: Some("010001".to_string()),
            telefon: None,
            email: None,
            iban: None,
            banca: None,
            platitor_tva: true,
        }
    }
}
