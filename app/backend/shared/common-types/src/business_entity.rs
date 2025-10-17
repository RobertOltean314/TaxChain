use crate::CountryCode;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessEntity {
    pub id: String,
    pub name: String,
    pub registration_number: String,
    pub tax_id: String,
    pub country_code: CountryCode,
    pub address: String,
    pub entity_type: BusinessEntityType,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BusinessEntityType {
    Individual,
    SRL, // Romanian LLC
    SA,  // Romanian SA
    PFA, // Romanian Individual Entrepreneur
    II,  // Romanian Individual Enterprise
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBusinessEntityRequest {
    pub name: String,
    pub registration_number: String,
    pub tax_id: String,
    pub country_code: CountryCode,
    pub address: String,
    pub entity_type: BusinessEntityType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessEntityValidationRequest {
    pub registration_number: String,
    pub tax_id: String,
    pub country_code: CountryCode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessEntityValidationResponse {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}
