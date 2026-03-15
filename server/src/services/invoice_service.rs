use std::io;
use std::sync::Arc;

use async_trait::async_trait;
use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{
    DocumentType, Invoice, InvoiceLine, InvoiceLineRequest, InvoiceStatus, VatRate,
};

// ============================================================================
// COMBINED RESPONSE TYPE
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct InvoiceWithLines {
    #[serde(flatten)]
    pub invoice: Invoice,
    pub lines: Vec<InvoiceLine>,
}

// ============================================================================
// SQL — DB columns aliased to English Rust field names
// NUMERIC columns are cast to ::text so sqlx reads them as String.
// We parse them to Decimal in the row→model conversion.
// ============================================================================

const SELECT_INVOICE: &str = "
    SELECT
        id,
        numar              AS number,
        serie              AS series,
        tip_document::text AS document_type,
        stare::text        AS status,
        data_emitere       AS issued_date,
        data_scadenta      AS due_date,
        data_livrare       AS delivery_date,
        emitent_pf_id      AS issuer_pf_id,
        emitent_pj_id      AS issuer_pj_id,
        partener_id        AS partner_id,
        moneda             AS currency,
        total_fara_tva::text  AS subtotal,
        total_tva::text       AS total_vat,
        total_cu_tva::text    AS total,
        suma_platita::text    AS amount_paid,
        rest_de_plata::text   AS amount_due,
        factura_referinta_id  AS reference_invoice_id,
        observatii            AS notes,
        conditii_plata        AS payment_terms,
        created_by,
        created_at,
        updated_at
    FROM factura
";

const SELECT_LINE: &str = "
    SELECT
        id,
        factura_id               AS invoice_id,
        pozitie                  AS position,
        denumire                 AS description,
        cod_produs               AS product_code,
        um                       AS unit,
        cantitate::text          AS quantity,
        pret_unitar::text        AS unit_price,
        discount_procent::text   AS discount_percent,
        cota_tva::text           AS vat_rate,
        valoare_fara_tva::text   AS line_subtotal,
        valoare_tva::text        AS line_vat,
        valoare_cu_tva::text     AS line_total,
        created_at,
        updated_at
    FROM factura_linie
";

const CREATE_INVOICE: &str = "
    INSERT INTO factura
        (id, numar, serie, tip_document, stare,
         data_emitere, data_scadenta, data_livrare,
         emitent_pf_id, emitent_pj_id, partener_id, moneda,
         total_fara_tva, total_tva, total_cu_tva,
         suma_platita, rest_de_plata,
         factura_referinta_id, observatii, conditii_plata,
         created_by, created_at, updated_at)
    VALUES
        ($1,$2,$3, $4::tip_document, $5::stare_factura,
         $6,$7,$8,
         $9,$10,$11,$12,
         $13::numeric, $14::numeric, $15::numeric,
         $16::numeric, $17::numeric,
         $18,$19,$20,
         $21,$22,$23)
    RETURNING
        id,
        numar              AS number,
        serie              AS series,
        tip_document::text AS document_type,
        stare::text        AS status,
        data_emitere       AS issued_date,
        data_scadenta      AS due_date,
        data_livrare       AS delivery_date,
        emitent_pf_id      AS issuer_pf_id,
        emitent_pj_id      AS issuer_pj_id,
        partener_id        AS partner_id,
        moneda             AS currency,
        total_fara_tva::text  AS subtotal,
        total_tva::text       AS total_vat,
        total_cu_tva::text    AS total,
        suma_platita::text    AS amount_paid,
        rest_de_plata::text   AS amount_due,
        factura_referinta_id  AS reference_invoice_id,
        observatii            AS notes,
        conditii_plata        AS payment_terms,
        created_by, created_at, updated_at
";

const INSERT_LINE: &str = "
    INSERT INTO factura_linie
        (id, factura_id, pozitie, denumire, cod_produs, um,
         cantitate, pret_unitar, discount_procent, cota_tva,
         valoare_fara_tva, valoare_tva, valoare_cu_tva,
         created_at, updated_at)
    VALUES
        ($1,$2,$3,$4,$5,$6,
         $7::numeric,$8::numeric,$9::numeric, $10::cota_tva,
         $11::numeric,$12::numeric,$13::numeric,
         $14,$15)
";

const UPDATE_TOTALS: &str = "
    UPDATE factura
    SET total_fara_tva = $1::numeric,
        total_tva      = $2::numeric,
        total_cu_tva   = $3::numeric,
        rest_de_plata  = $4::numeric,
        updated_at     = $5
    WHERE id = $6
";

const UPDATE_HEADER: &str = "
    UPDATE factura
    SET numar = $1, serie = $2,
        tip_document = $3::tip_document,
        data_emitere = $4, data_scadenta = $5, data_livrare = $6,
        emitent_pf_id = $7, emitent_pj_id = $8, partener_id = $9,
        moneda = $10,
        factura_referinta_id = $11,
        observatii = $12, conditii_plata = $13,
        updated_at = $14
    WHERE id = $15 AND created_by = $16
    RETURNING
        id,
        numar              AS number,
        serie              AS series,
        tip_document::text AS document_type,
        stare::text        AS status,
        data_emitere       AS issued_date,
        data_scadenta      AS due_date,
        data_livrare       AS delivery_date,
        emitent_pf_id      AS issuer_pf_id,
        emitent_pj_id      AS issuer_pj_id,
        partener_id        AS partner_id,
        moneda             AS currency,
        total_fara_tva::text  AS subtotal,
        total_tva::text       AS total_vat,
        total_cu_tva::text    AS total,
        suma_platita::text    AS amount_paid,
        rest_de_plata::text   AS amount_due,
        factura_referinta_id  AS reference_invoice_id,
        observatii            AS notes,
        conditii_plata        AS payment_terms,
        created_by, created_at, updated_at
";

const UPDATE_STATUS: &str = "
    UPDATE factura
    SET stare = $1::stare_factura, updated_at = $2
    WHERE id = $3 AND created_by = $4
    RETURNING
        id,
        numar              AS number,
        serie              AS series,
        tip_document::text AS document_type,
        stare::text        AS status,
        data_emitere       AS issued_date,
        data_scadenta      AS due_date,
        data_livrare       AS delivery_date,
        emitent_pf_id      AS issuer_pf_id,
        emitent_pj_id      AS issuer_pj_id,
        partener_id        AS partner_id,
        moneda             AS currency,
        total_fara_tva::text  AS subtotal,
        total_tva::text       AS total_vat,
        total_cu_tva::text    AS total,
        suma_platita::text    AS amount_paid,
        rest_de_plata::text   AS amount_due,
        factura_referinta_id  AS reference_invoice_id,
        observatii            AS notes,
        conditii_plata        AS payment_terms,
        created_by, created_at, updated_at
";

const UPDATE_PAYMENT: &str = "
    UPDATE factura
    SET suma_platita  = $1::numeric,
        rest_de_plata = total_cu_tva - $1::numeric,
        updated_at    = $2
    WHERE id = $3 AND created_by = $4
    RETURNING
        id,
        numar              AS number,
        serie              AS series,
        tip_document::text AS document_type,
        stare::text        AS status,
        data_emitere       AS issued_date,
        data_scadenta      AS due_date,
        data_livrare       AS delivery_date,
        emitent_pf_id      AS issuer_pf_id,
        emitent_pj_id      AS issuer_pj_id,
        partener_id        AS partner_id,
        moneda             AS currency,
        total_fara_tva::text  AS subtotal,
        total_tva::text       AS total_vat,
        total_cu_tva::text    AS total,
        suma_platita::text    AS amount_paid,
        rest_de_plata::text   AS amount_due,
        factura_referinta_id  AS reference_invoice_id,
        observatii            AS notes,
        conditii_plata        AS payment_terms,
        created_by, created_at, updated_at
";

const DELETE_LINES: &str = "DELETE FROM factura_linie WHERE factura_id = $1";
const DELETE_INVOICE: &str =
    "DELETE FROM factura WHERE id = $1 AND created_by = $2 AND stare = 'Draft'::stare_factura";

// ============================================================================
// ROW TYPES — NUMERIC columns as String
// ============================================================================

#[derive(sqlx::FromRow)]
struct InvoiceRow {
    id: Uuid,
    number: String,
    series: Option<String>,
    document_type: String,
    status: String,
    issued_date: chrono::NaiveDate,
    due_date: Option<chrono::NaiveDate>,
    delivery_date: Option<chrono::NaiveDate>,
    issuer_pf_id: Option<Uuid>,
    issuer_pj_id: Option<Uuid>,
    partner_id: Uuid,
    currency: String,
    subtotal: String,
    total_vat: String,
    total: String,
    amount_paid: String,
    amount_due: String,
    reference_invoice_id: Option<Uuid>,
    notes: Option<String>,
    payment_terms: Option<String>,
    created_by: Uuid,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(sqlx::FromRow)]
struct InvoiceLineRow {
    id: Uuid,
    invoice_id: Uuid,
    position: i16,
    description: String,
    product_code: Option<String>,
    unit: String,
    quantity: String,
    unit_price: String,
    discount_percent: String,
    vat_rate: String,
    line_subtotal: String,
    line_vat: String,
    line_total: String,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

fn decode_err(msg: String) -> sqlx::Error {
    sqlx::Error::Decode(Box::new(io::Error::new(io::ErrorKind::InvalidData, msg)))
}

fn parse_decimal(s: &str, field: &str) -> Result<Decimal, sqlx::Error> {
    s.parse::<Decimal>()
        .map_err(|e| decode_err(format!("Cannot parse {field} as Decimal (got {s:?}): {e}")))
}

fn row_to_invoice(row: InvoiceRow) -> Result<Invoice, sqlx::Error> {
    let document_type = match row.document_type.as_str() {
        "FiscalA" => DocumentType::TaxInvoice,
        "ProformA" => DocumentType::Proforma,
        "NotaDeCredit" => DocumentType::CreditNote,
        "Chitanta" => DocumentType::Receipt,
        "AvizDeExpeditie" => DocumentType::DeliveryNote,
        other => return Err(decode_err(format!("Unknown document_type: {other}"))),
    };
    let status = match row.status.as_str() {
        "Draft" => InvoiceStatus::Draft,
        "Emisa" => InvoiceStatus::Issued,
        "Trimisa" => InvoiceStatus::Sent,
        "Platita" => InvoiceStatus::Paid,
        "Anulata" => InvoiceStatus::Cancelled,
        other => return Err(decode_err(format!("Unknown invoice status: {other}"))),
    };
    Ok(Invoice {
        id: row.id,
        number: row.number,
        series: row.series,
        document_type,
        status,
        issued_date: row.issued_date,
        due_date: row.due_date,
        delivery_date: row.delivery_date,
        issuer_pf_id: row.issuer_pf_id,
        issuer_pj_id: row.issuer_pj_id,
        partner_id: row.partner_id,
        currency: row.currency,
        subtotal: parse_decimal(&row.subtotal, "subtotal")?,
        total_vat: parse_decimal(&row.total_vat, "total_vat")?,
        total: parse_decimal(&row.total, "total")?,
        amount_paid: parse_decimal(&row.amount_paid, "amount_paid")?,
        amount_due: parse_decimal(&row.amount_due, "amount_due")?,
        reference_invoice_id: row.reference_invoice_id,
        notes: row.notes,
        payment_terms: row.payment_terms,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

fn row_to_line(row: InvoiceLineRow) -> Result<InvoiceLine, sqlx::Error> {
    let vat_rate = match row.vat_rate.as_str() {
        "Standard" => VatRate::Standard,
        "Redusa9" => VatRate::Reduced9,
        "Redusa5" => VatRate::Reduced5,
        "Scutit" => VatRate::Exempt,
        other => return Err(decode_err(format!("Unknown vat_rate: {other}"))),
    };
    Ok(InvoiceLine {
        id: row.id,
        invoice_id: row.invoice_id,
        position: row.position,
        description: row.description,
        product_code: row.product_code,
        unit: row.unit,
        quantity: parse_decimal(&row.quantity, "quantity")?,
        unit_price: parse_decimal(&row.unit_price, "unit_price")?,
        discount_percent: parse_decimal(&row.discount_percent, "discount_percent")?,
        vat_rate,
        line_subtotal: parse_decimal(&row.line_subtotal, "line_subtotal")?,
        line_vat: parse_decimal(&row.line_vat, "line_vat")?,
        line_total: parse_decimal(&row.line_total, "line_total")?,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

fn document_type_to_db(t: DocumentType) -> &'static str {
    match t {
        DocumentType::TaxInvoice => "FiscalA",
        DocumentType::Proforma => "ProformA",
        DocumentType::CreditNote => "NotaDeCredit",
        DocumentType::Receipt => "Chitanta",
        DocumentType::DeliveryNote => "AvizDeExpeditie",
    }
}

fn status_to_db(s: InvoiceStatus) -> &'static str {
    match s {
        InvoiceStatus::Draft => "Draft",
        InvoiceStatus::Issued => "Emisa",
        InvoiceStatus::Sent => "Trimisa",
        InvoiceStatus::Paid => "Platita",
        InvoiceStatus::Cancelled => "Anulata",
    }
}

fn vat_rate_to_db(v: VatRate) -> &'static str {
    match v {
        VatRate::Standard => "Standard",
        VatRate::Reduced9 => "Redusa9",
        VatRate::Reduced5 => "Redusa5",
        VatRate::Exempt => "Scutit",
    }
}

// ============================================================================
// REPOSITORY TRAIT
// ============================================================================

#[async_trait]
pub trait InvoiceRepository: Send + Sync {
    async fn find_all_for_user(&self, user_id: Uuid) -> Result<Vec<Invoice>, sqlx::Error>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Invoice>, sqlx::Error>;
    async fn find_lines(&self, invoice_id: Uuid) -> Result<Vec<InvoiceLine>, sqlx::Error>;
    async fn create(
        &self,
        invoice: Invoice,
        lines: Vec<InvoiceLineRequest>,
    ) -> Result<InvoiceWithLines, sqlx::Error>;
    async fn update(
        &self,
        id: Uuid,
        invoice: Invoice,
        lines: Vec<InvoiceLineRequest>,
        user_id: Uuid,
    ) -> Result<Option<InvoiceWithLines>, sqlx::Error>;
    async fn update_status(
        &self,
        id: Uuid,
        status: InvoiceStatus,
        user_id: Uuid,
    ) -> Result<Option<Invoice>, sqlx::Error>;
    async fn update_payment(
        &self,
        id: Uuid,
        amount: Decimal,
        user_id: Uuid,
    ) -> Result<Option<Invoice>, sqlx::Error>;
    async fn delete(&self, id: Uuid, user_id: Uuid) -> Result<bool, sqlx::Error>;
}

pub type DynInvoiceRepository = Arc<dyn InvoiceRepository>;

// ============================================================================
// POSTGRES IMPLEMENTATION
// ============================================================================

pub struct PgInvoiceRepository {
    pool: PgPool,
}

impl PgInvoiceRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    async fn insert_lines(
        &self,
        tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        invoice_id: Uuid,
        lines: Vec<InvoiceLineRequest>,
    ) -> Result<(Decimal, Decimal, Decimal), sqlx::Error> {
        let mut sum_subtotal = Decimal::ZERO;
        let mut sum_vat = Decimal::ZERO;
        let mut sum_total = Decimal::ZERO;

        for (i, req) in lines.into_iter().enumerate() {
            let line = InvoiceLine::from_request(req, invoice_id, (i + 1) as i16);
            sum_subtotal += line.line_subtotal;
            sum_vat += line.line_vat;
            sum_total += line.line_total;

            sqlx::query(INSERT_LINE)
                .bind(line.id)
                .bind(line.invoice_id)
                .bind(line.position)
                .bind(&line.description)
                .bind(&line.product_code)
                .bind(&line.unit)
                .bind(line.quantity.to_string())
                .bind(line.unit_price.to_string())
                .bind(line.discount_percent.to_string())
                .bind(vat_rate_to_db(line.vat_rate))
                .bind(line.line_subtotal.to_string())
                .bind(line.line_vat.to_string())
                .bind(line.line_total.to_string())
                .bind(line.created_at)
                .bind(line.updated_at)
                .execute(&mut **tx)
                .await?;
        }

        Ok((sum_subtotal, sum_vat, sum_total))
    }
}

#[async_trait]
impl InvoiceRepository for PgInvoiceRepository {
    async fn find_all_for_user(&self, user_id: Uuid) -> Result<Vec<Invoice>, sqlx::Error> {
        let rows = sqlx::query_as::<_, InvoiceRow>(&format!(
            "{SELECT_INVOICE} WHERE created_by = $1 ORDER BY issued_date DESC"
        ))
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_invoice).collect()
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Invoice>, sqlx::Error> {
        let row = sqlx::query_as::<_, InvoiceRow>(&format!("{SELECT_INVOICE} WHERE id = $1"))
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        row.map(row_to_invoice).transpose()
    }

    async fn find_lines(&self, invoice_id: Uuid) -> Result<Vec<InvoiceLine>, sqlx::Error> {
        let rows = sqlx::query_as::<_, InvoiceLineRow>(&format!(
            "{SELECT_LINE} WHERE factura_id = $1 ORDER BY pozitie ASC"
        ))
        .bind(invoice_id)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_line).collect()
    }

    async fn create(
        &self,
        invoice: Invoice,
        lines: Vec<InvoiceLineRequest>,
    ) -> Result<InvoiceWithLines, sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        let header_row = sqlx::query_as::<_, InvoiceRow>(CREATE_INVOICE)
            .bind(invoice.id)
            .bind(&invoice.number)
            .bind(&invoice.series)
            .bind(document_type_to_db(invoice.document_type))
            .bind(status_to_db(invoice.status))
            .bind(invoice.issued_date)
            .bind(invoice.due_date)
            .bind(invoice.delivery_date)
            .bind(invoice.issuer_pf_id)
            .bind(invoice.issuer_pj_id)
            .bind(invoice.partner_id)
            .bind(&invoice.currency)
            .bind("0") // total_fara_tva
            .bind("0") // total_tva
            .bind("0") // total_cu_tva
            .bind("0") // suma_platita
            .bind("0") // rest_de_plata
            .bind(invoice.reference_invoice_id)
            .bind(&invoice.notes)
            .bind(&invoice.payment_terms)
            .bind(invoice.created_by)
            .bind(invoice.created_at)
            .bind(invoice.updated_at)
            .fetch_one(&mut *tx)
            .await?;

        let (subtotal, total_vat, total) = self.insert_lines(&mut tx, invoice.id, lines).await?;

        let now = chrono::Utc::now();
        sqlx::query(UPDATE_TOTALS)
            .bind(subtotal.to_string())
            .bind(total_vat.to_string())
            .bind(total.to_string())
            .bind(total.to_string()) // amount_due = total when nothing paid yet
            .bind(now)
            .bind(invoice.id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        let mut inv = row_to_invoice(header_row)?;
        inv.subtotal = subtotal;
        inv.total_vat = total_vat;
        inv.total = total;
        inv.amount_due = total;

        let fetched_lines = self.find_lines(invoice.id).await?;
        Ok(InvoiceWithLines {
            invoice: inv,
            lines: fetched_lines,
        })
    }

    async fn update(
        &self,
        id: Uuid,
        invoice: Invoice,
        lines: Vec<InvoiceLineRequest>,
        user_id: Uuid,
    ) -> Result<Option<InvoiceWithLines>, sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        let maybe_row = sqlx::query_as::<_, InvoiceRow>(UPDATE_HEADER)
            .bind(&invoice.number)
            .bind(&invoice.series)
            .bind(document_type_to_db(invoice.document_type))
            .bind(invoice.issued_date)
            .bind(invoice.due_date)
            .bind(invoice.delivery_date)
            .bind(invoice.issuer_pf_id)
            .bind(invoice.issuer_pj_id)
            .bind(invoice.partner_id)
            .bind(&invoice.currency)
            .bind(invoice.reference_invoice_id)
            .bind(&invoice.notes)
            .bind(&invoice.payment_terms)
            .bind(invoice.updated_at)
            .bind(id)
            .bind(user_id)
            .fetch_optional(&mut *tx)
            .await?;

        let header_row = match maybe_row {
            Some(r) => r,
            None => {
                tx.rollback().await?;
                return Ok(None);
            }
        };

        let existing_paid = parse_decimal(&header_row.amount_paid, "amount_paid")?;

        sqlx::query(DELETE_LINES).bind(id).execute(&mut *tx).await?;

        let (subtotal, total_vat, total) = self.insert_lines(&mut tx, id, lines).await?;

        let now = chrono::Utc::now();
        sqlx::query(UPDATE_TOTALS)
            .bind(subtotal.to_string())
            .bind(total_vat.to_string())
            .bind(total.to_string())
            .bind((total - existing_paid).to_string())
            .bind(now)
            .bind(id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        let mut inv = row_to_invoice(header_row)?;
        inv.subtotal = subtotal;
        inv.total_vat = total_vat;
        inv.total = total;
        inv.amount_due = total - inv.amount_paid;

        let fetched_lines = self.find_lines(id).await?;
        Ok(Some(InvoiceWithLines {
            invoice: inv,
            lines: fetched_lines,
        }))
    }

    async fn update_status(
        &self,
        id: Uuid,
        status: InvoiceStatus,
        user_id: Uuid,
    ) -> Result<Option<Invoice>, sqlx::Error> {
        let now = chrono::Utc::now();
        let row = sqlx::query_as::<_, InvoiceRow>(UPDATE_STATUS)
            .bind(status_to_db(status))
            .bind(now)
            .bind(id)
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await?;

        row.map(row_to_invoice).transpose()
    }

    async fn update_payment(
        &self,
        id: Uuid,
        amount: Decimal,
        user_id: Uuid,
    ) -> Result<Option<Invoice>, sqlx::Error> {
        let now = chrono::Utc::now();
        let row = sqlx::query_as::<_, InvoiceRow>(UPDATE_PAYMENT)
            .bind(amount.to_string())
            .bind(now)
            .bind(id)
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await?;

        row.map(row_to_invoice).transpose()
    }

    async fn delete(&self, id: Uuid, user_id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(DELETE_INVOICE)
            .bind(id)
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}
