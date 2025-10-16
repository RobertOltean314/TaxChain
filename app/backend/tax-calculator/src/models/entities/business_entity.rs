use crate::models::CountryCode;
pub trait BusinessEntity {
    fn get_name(&self) -> &str;
    fn get_address(&self) -> &str;
    fn get_tax_id(&self) -> &str;
    fn get_country_code(&self) -> &CountryCode;
}
