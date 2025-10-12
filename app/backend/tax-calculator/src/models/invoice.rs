use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct InvoiceData {
    pub invoices: Vec<Invoice>,
}

#[derive(Debug, Deserialize)]
pub struct Invoice {
    pub amount: f64,
    pub invoice_type: InvoiceType,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub enum InvoiceType {
    Income,
    Expense,
}
