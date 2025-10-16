use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

use crate::models::{InvoiceTotals, LineItem};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaseInvoice {
    pub invoice_number: String,
    pub issue_date: NaiveDate,
    pub due_date: Option<NaiveDate>,
    pub line_items: Vec<LineItem>,
    pub totals: InvoiceTotals,
    pub notes: Option<String>,
}
