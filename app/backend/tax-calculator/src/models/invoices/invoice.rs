use chrono::NaiveDate;
use rust_decimal::Decimal;

use crate::models::{entities::business_entity::BusinessEntity, LineItem, ValidationError};

pub trait Invoice {
    fn get_invoice_number(&self) -> &str;
    fn get_issue_date(&self) -> NaiveDate;
    fn get_total_amount(&self) -> Decimal;
    fn get_currency(&self) -> String;
    fn get_seller_info(&self) -> &dyn BusinessEntity;
    fn get_buyer_info(&self) -> &dyn BusinessEntity;
    fn get_line_items(&self) -> &[LineItem];
    fn calculate_hash(&self) -> String;
    fn validate(&self) -> Result<(), ValidationError>;
}
