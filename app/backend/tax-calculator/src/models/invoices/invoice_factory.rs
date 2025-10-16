use crate::models::{invoices::InvoiceType, Invoice, RomanianBusinessEntity, RomanianInvoiceModel};

pub struct InvoiceFactory {}

impl InvoiceFactory {
    pub fn create_invoice(invoice_type: InvoiceType) -> Box<dyn Invoice> {
        match invoice_type {
            InvoiceType::Romanian => Box::new(RomanianInvoiceModel::new(
                "FAC-2024-001".to_string(),
                RomanianBusinessEntity::default(),
                RomanianBusinessEntity::default(),
                vec![],
            )),
        }
    }
}
