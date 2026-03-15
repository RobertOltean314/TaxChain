use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

// ============================================================================
// ENUMS
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DocumentType {
    /// Standard tax invoice (Factură fiscală)
    TaxInvoice,
    /// Proforma / quote invoice — not a fiscal document
    Proforma,
    /// Credit note — reverses or corrects a previous TaxInvoice
    CreditNote,
    /// Cash receipt (Chitanță)
    Receipt,
    /// Delivery note — no VAT, tracks goods movement (Aviz de expediție)
    DeliveryNote,
}

impl Default for DocumentType {
    fn default() -> Self {
        Self::TaxInvoice
    }
}

/// Invoice lifecycle status.
///
/// Valid transitions:
///   Draft   → Issued  | Cancelled
///   Issued  → Sent    | Cancelled
///   Sent    → Paid    | Cancelled
///   Paid    → (terminal)
///   Cancelled → (terminal)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum InvoiceStatus {
    Draft,
    Issued,
    Sent,
    Paid,
    Cancelled,
}

impl Default for InvoiceStatus {
    fn default() -> Self {
        Self::Draft
    }
}

impl InvoiceStatus {
    /// Returns `true` if transitioning from `self` to `next` is permitted.
    pub fn can_transition_to(self, next: InvoiceStatus) -> bool {
        matches!(
            (self, next),
            (InvoiceStatus::Draft, InvoiceStatus::Issued)
                | (InvoiceStatus::Draft, InvoiceStatus::Cancelled)
                | (InvoiceStatus::Issued, InvoiceStatus::Sent)
                | (InvoiceStatus::Issued, InvoiceStatus::Cancelled)
                | (InvoiceStatus::Sent, InvoiceStatus::Paid)
                | (InvoiceStatus::Sent, InvoiceStatus::Cancelled)
        )
    }
}

/// Romanian VAT rates (2025).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum VatRate {
    /// 19% — standard rate
    Standard,
    /// 9% — food, pharma, books, hotel
    Reduced9,
    /// 5% — social housing, certain cultural services
    Reduced5,
    /// 0% — exempt (exports, intra-EU supply, etc.)
    Exempt,
}

impl Default for VatRate {
    fn default() -> Self {
        Self::Standard
    }
}

impl VatRate {
    /// Returns the rate as a multiplier (e.g. `0.19` for Standard).
    pub fn multiplier(self) -> Decimal {
        match self {
            VatRate::Standard => Decimal::new(19, 2),
            VatRate::Reduced9 => Decimal::new(9, 2),
            VatRate::Reduced5 => Decimal::new(5, 2),
            VatRate::Exempt => Decimal::ZERO,
        }
    }
}

// ============================================================================
// INVOICE — header
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Invoice {
    pub id: Uuid,

    pub number: String,
    pub series: Option<String>,
    pub document_type: DocumentType,
    pub status: InvoiceStatus,

    pub issued_date: NaiveDate,
    pub due_date: Option<NaiveDate>,
    pub delivery_date: Option<NaiveDate>,

    /// Issuer — exactly one must be non-null (enforced at handler level)
    pub issuer_pf_id: Option<Uuid>,
    pub issuer_pj_id: Option<Uuid>,

    pub partner_id: Uuid,

    pub currency: String,
    pub subtotal: Decimal,
    pub total_vat: Decimal,
    pub total: Decimal,
    pub amount_paid: Decimal,
    pub amount_due: Decimal,

    /// For credit notes: the invoice being reversed
    pub reference_invoice_id: Option<Uuid>,

    pub notes: Option<String>,
    pub payment_terms: Option<String>,

    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ============================================================================
// INVOICE LINE
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InvoiceLine {
    pub id: Uuid,
    pub invoice_id: Uuid,

    pub position: i16,
    pub description: String,
    pub product_code: Option<String>,
    pub unit: String,

    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub discount_percent: Decimal,

    pub vat_rate: VatRate,

    /// quantity * unit_price * (1 - discount_percent / 100)
    pub line_subtotal: Decimal,
    /// line_subtotal * vat_rate.multiplier()
    pub line_vat: Decimal,
    /// line_subtotal + line_vat
    pub line_total: Decimal,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl InvoiceLine {
    /// Recomputes `line_subtotal`, `line_vat`, and `line_total` from primary fields.
    pub fn recompute_totals(&mut self) {
        let hundred = Decimal::new(100, 0);
        let discount_factor = (hundred - self.discount_percent) / hundred;
        self.line_subtotal = (self.quantity * self.unit_price * discount_factor).round_dp(2);
        self.line_vat = (self.line_subtotal * self.vat_rate.multiplier()).round_dp(2);
        self.line_total = self.line_subtotal + self.line_vat;
    }
}

// ============================================================================
// REQUEST STRUCTS
// ============================================================================

/// Body for `POST /invoice` and `PUT /invoice/:id`.
/// Line items are included inline and created/replaced atomically.
#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct InvoiceRequest {
    #[validate(length(min = 1, max = 50, message = "number must be 1–50 characters"))]
    pub number: String,

    #[validate(length(max = 20, message = "series max 20 characters"))]
    pub series: Option<String>,

    pub document_type: Option<DocumentType>,

    pub issued_date: NaiveDate,
    pub due_date: Option<NaiveDate>,
    pub delivery_date: Option<NaiveDate>,

    pub issuer_pf_id: Option<Uuid>,
    pub issuer_pj_id: Option<Uuid>,

    pub partner_id: Uuid,

    #[validate(length(
        min = 3,
        max = 3,
        message = "currency must be a 3-letter code (e.g. RON)"
    ))]
    pub currency: Option<String>,

    pub amount_paid: Option<Decimal>,
    pub reference_invoice_id: Option<Uuid>,

    #[validate(length(max = 2000, message = "notes max 2000 characters"))]
    pub notes: Option<String>,

    #[validate(length(max = 200, message = "payment_terms max 200 characters"))]
    pub payment_terms: Option<String>,

    #[validate(nested)]
    pub lines: Vec<InvoiceLineRequest>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct InvoiceLineRequest {
    pub position: Option<i16>,

    #[validate(length(min = 1, max = 300, message = "description must be 1–300 characters"))]
    pub description: String,

    #[validate(length(max = 100, message = "product_code max 100 characters"))]
    pub product_code: Option<String>,

    #[validate(length(min = 1, max = 20, message = "unit must be 1–20 characters"))]
    pub unit: Option<String>,

    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub discount_percent: Option<Decimal>,
    pub vat_rate: Option<VatRate>,
}

/// Body for `PATCH /invoice/:id/status`.
#[derive(Debug, Deserialize, Serialize)]
pub struct InvoiceStatusRequest {
    pub status: InvoiceStatus,
}

/// Body for `PATCH /invoice/:id/payment`.
#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct InvoicePaymentRequest {
    pub amount: Decimal,
}

// ============================================================================
// CONSTRUCTORS
// ============================================================================

impl Invoice {
    /// Creates a new `Invoice` from a validated request.
    /// All monetary totals start at zero — populated after lines are inserted.
    pub fn from_request(req: &InvoiceRequest, created_by: Uuid) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            number: req.number.clone(),
            series: req.series.clone(),
            document_type: req.document_type.unwrap_or_default(),
            status: InvoiceStatus::Draft,
            issued_date: req.issued_date,
            due_date: req.due_date,
            delivery_date: req.delivery_date,
            issuer_pf_id: req.issuer_pf_id,
            issuer_pj_id: req.issuer_pj_id,
            partner_id: req.partner_id,
            currency: req.currency.clone().unwrap_or_else(|| "RON".to_string()),
            subtotal: Decimal::ZERO,
            total_vat: Decimal::ZERO,
            total: Decimal::ZERO,
            amount_paid: Decimal::ZERO,
            amount_due: Decimal::ZERO,
            reference_invoice_id: req.reference_invoice_id,
            notes: req.notes.clone(),
            payment_terms: req.payment_terms.clone(),
            created_by,
            created_at: now,
            updated_at: now,
        }
    }

    /// Produces an updated `Invoice` from a request, preserving immutable fields.
    pub fn update_from_request(existing: &Invoice, req: &InvoiceRequest) -> Self {
        let now = Utc::now();
        Self {
            id: existing.id,
            number: req.number.clone(),
            series: req.series.clone(),
            document_type: req.document_type.unwrap_or(existing.document_type),
            status: existing.status,
            issued_date: req.issued_date,
            due_date: req.due_date,
            delivery_date: req.delivery_date,
            issuer_pf_id: req.issuer_pf_id,
            issuer_pj_id: req.issuer_pj_id,
            partner_id: req.partner_id,
            currency: req
                .currency
                .clone()
                .unwrap_or_else(|| existing.currency.clone()),
            subtotal: existing.subtotal,
            total_vat: existing.total_vat,
            total: existing.total,
            amount_paid: req.amount_paid.unwrap_or(existing.amount_paid),
            amount_due: existing.amount_due,
            reference_invoice_id: req.reference_invoice_id,
            notes: req.notes.clone(),
            payment_terms: req.payment_terms.clone(),
            created_by: existing.created_by,
            created_at: existing.created_at,
            updated_at: now,
        }
    }
}

impl InvoiceLine {
    /// Creates a new `InvoiceLine`, computing all derived totals immediately.
    pub fn from_request(req: InvoiceLineRequest, invoice_id: Uuid, position: i16) -> Self {
        let now = Utc::now();
        let mut line = Self {
            id: Uuid::new_v4(),
            invoice_id,
            position: req.position.unwrap_or(position),
            description: req.description,
            product_code: req.product_code,
            unit: req.unit.unwrap_or_else(|| "pcs".to_string()),
            quantity: req.quantity,
            unit_price: req.unit_price,
            discount_percent: req.discount_percent.unwrap_or(Decimal::ZERO),
            vat_rate: req.vat_rate.unwrap_or_default(),
            line_subtotal: Decimal::ZERO,
            line_vat: Decimal::ZERO,
            line_total: Decimal::ZERO,
            created_at: now,
            updated_at: now,
        };
        line.recompute_totals();
        line
    }
}
