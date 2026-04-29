use chrono::DateTime;
use rust_decimal::Decimal;
use uuid::{Uuid, uuid};

use taxchain::models::{DocumentType, Invoice, InvoiceLine, InvoiceStatus, TransactionType, VatRate};

use crate::common::{TEST_PF_ID, TEST_USER_ID};

pub const DRAFT_ID: Uuid = uuid!("cccccccc-cccc-cccc-cccc-cccccccccccc");
pub const ISSUED_ID: Uuid = uuid!("dddddddd-dddd-dddd-dddd-dddddddddddd");
pub const NONEXISTENT_ID: Uuid = uuid!("00000000-0000-0000-0000-000000000000");
pub const PARTNER_ID: Uuid = uuid!("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");

fn base_invoice(id: Uuid, number: &str, status: InvoiceStatus) -> Invoice {
    use chrono::NaiveDate;
    Invoice {
        id,
        number: number.to_string(),
        series: Some("FC".to_string()),
        document_type: DocumentType::TaxInvoice,
        transaction_type: Some(TransactionType::Income),
        status,
        issued_date: NaiveDate::from_ymd_opt(2025, 1, 15).unwrap(),
        due_date: Some(NaiveDate::from_ymd_opt(2025, 2, 15).unwrap()),
        delivery_date: None,
        issuer_pf_id: Some(TEST_PF_ID),
        issuer_pj_id: None,
        partner_id: PARTNER_ID,
        currency: "RON".to_string(),
        subtotal: Decimal::new(100, 0),
        total_vat: Decimal::new(21, 0),
        total: Decimal::new(121, 0),
        amount_paid: Decimal::ZERO,
        amount_due: Decimal::new(121, 0),
        reference_invoice_id: None,
        notes: None,
        payment_terms: None,
        created_by: TEST_USER_ID,
        created_at: DateTime::from_timestamp(0, 0).unwrap(),
        updated_at: DateTime::from_timestamp(0, 0).unwrap(),
        tx_hash: None,
        block_number: None,
        anchored_at: None,
    }
}

pub fn mock_draft_invoice() -> Invoice {
    base_invoice(DRAFT_ID, "FC-2025-001", InvoiceStatus::Draft)
}

pub fn mock_issued_invoice() -> Invoice {
    base_invoice(ISSUED_ID, "FC-2025-002", InvoiceStatus::Issued)
}

pub fn mock_invoice_line() -> InvoiceLine {
    InvoiceLine {
        id: uuid!("11111111-1111-1111-1111-111111111111"),
        invoice_id: DRAFT_ID,
        position: 1,
        description: "Test service".to_string(),
        product_code: None,
        unit: "pcs".to_string(),
        quantity: Decimal::ONE,
        unit_price: Decimal::new(100, 0),
        discount_percent: Decimal::ZERO,
        vat_rate: VatRate::Standard,
        line_subtotal: Decimal::new(100, 0),
        line_vat: Decimal::new(21, 0),
        line_total: Decimal::new(121, 0),
        created_at: DateTime::from_timestamp(0, 0).unwrap(),
        updated_at: DateTime::from_timestamp(0, 0).unwrap(),
    }
}
