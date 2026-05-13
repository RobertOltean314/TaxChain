use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::Serialize;
use sqlx::{FromRow, PgPool};
use std::str::FromStr;
use std::sync::Arc;
use uuid::Uuid;

// ── Output types ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct VatSummaryLine {
    pub cota_tva: String,
    pub tip_tranzactie: String,
    pub base: Decimal,
    pub vat: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct VatSummary {
    pub lines: Vec<VatSummaryLine>,
    pub income_base_total: Decimal,
    pub income_vat_total: Decimal,
    pub expense_base_total: Decimal,
    pub expense_vat_total: Decimal,
    pub net_vat: Decimal,
    pub from: NaiveDate,
    pub to: NaiveDate,
}

// ── Internal DB rows ──────────────────────────────────────────────────────────

#[derive(FromRow)]
struct VatRow {
    cota_tva: Option<String>,
    tip_tranzactie: Option<String>,
    base: Option<String>,
    vat: Option<String>,
}

/// Per-invoice row for ZK circuit input construction.
#[derive(Debug, Clone)]
pub struct InvoiceZkRow {
    pub tip_tranzactie: String,
    pub currency: String,
    pub base: Decimal,
    pub vat: Decimal,
}

#[derive(FromRow)]
struct InvoiceZkDbRow {
    tip_tranzactie: Option<String>,
    currency: String,
    base: Option<String>,
    vat: Option<String>,
}

/// Currency-aware VAT totals for proof generation (pre-conversion).
#[derive(Debug, Clone)]
pub struct CurrencyVatTotal {
    pub currency: String,
    pub income_base: Decimal,
    pub income_vat: Decimal,
    pub expense_base: Decimal,
    pub expense_vat: Decimal,
}

#[derive(FromRow)]
struct CurrencyVatRow {
    currency: String,
    tip_tranzactie: Option<String>,
    base: Option<String>,
    vat: Option<String>,
}

// ── Service ───────────────────────────────────────────────────────────────────

pub struct ReportService {
    pool: PgPool,
}

impl ReportService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn vat_summary(
        &self,
        entity_type: &str,
        entity_id: Uuid,
        from: NaiveDate,
        to: NaiveDate,
    ) -> Result<VatSummary, sqlx::Error> {
        // Aggregate VAT by rate and transaction type from paid invoices.
        // Uses two separate conditions to avoid CASE in WHERE with UUID params.
        let sql = if entity_type == "PF" {
            r#"
            SELECT
                fl.cota_tva::text          AS cota_tva,
                f.tip_tranzactie::text     AS tip_tranzactie,
                SUM(fl.valoare_fara_tva)::text   AS base,
                SUM(fl.valoare_tva)::text        AS vat
            FROM factura f
            JOIN factura_linie fl ON fl.factura_id = f.id
            WHERE f.stare = 'Platita'
              AND f.emitent_pf_id = $1
              AND f.data_emitere BETWEEN $2 AND $3
            GROUP BY fl.cota_tva, f.tip_tranzactie
            ORDER BY tip_tranzactie, cota_tva
            "#
        } else {
            r#"
            SELECT
                fl.cota_tva::text          AS cota_tva,
                f.tip_tranzactie::text     AS tip_tranzactie,
                SUM(fl.valoare_fara_tva)::text   AS base,
                SUM(fl.valoare_tva)::text        AS vat
            FROM factura f
            JOIN factura_linie fl ON fl.factura_id = f.id
            WHERE f.stare = 'Platita'
              AND f.emitent_pj_id = $1
              AND f.data_emitere BETWEEN $2 AND $3
            GROUP BY fl.cota_tva, f.tip_tranzactie
            ORDER BY tip_tranzactie, cota_tva
            "#
        };

        let rows: Vec<VatRow> = sqlx::query_as(sql)
            .bind(entity_id)
            .bind(from)
            .bind(to)
            .fetch_all(&self.pool)
            .await?;

        let lines: Vec<VatSummaryLine> = rows
            .into_iter()
            .map(|r| VatSummaryLine {
                cota_tva: r.cota_tva.unwrap_or_else(|| "Necunoscut".into()),
                tip_tranzactie: r.tip_tranzactie.unwrap_or_else(|| "Necunoscut".into()),
                base: Decimal::from_str(&r.base.unwrap_or_default()).unwrap_or(Decimal::ZERO),
                vat: Decimal::from_str(&r.vat.unwrap_or_default()).unwrap_or(Decimal::ZERO),
            })
            .collect();

        let income_base_total = lines
            .iter()
            .filter(|l| l.tip_tranzactie == "Venit")
            .map(|l| l.base)
            .sum();
        let income_vat_total = lines
            .iter()
            .filter(|l| l.tip_tranzactie == "Venit")
            .map(|l| l.vat)
            .sum();
        let expense_base_total = lines
            .iter()
            .filter(|l| l.tip_tranzactie == "Cheltuiala")
            .map(|l| l.base)
            .sum();
        let expense_vat_total = lines
            .iter()
            .filter(|l| l.tip_tranzactie == "Cheltuiala")
            .map(|l| l.vat)
            .sum();
        let net_vat: Decimal = income_vat_total - expense_vat_total;

        Ok(VatSummary {
            lines,
            income_base_total,
            income_vat_total,
            expense_base_total,
            expense_vat_total,
            net_vat,
            from,
            to,
        })
    }

    /// Returns VAT totals grouped by currency — used by the proof handler
    /// so it can apply BNR conversion to RON before committing the hash.
    pub async fn vat_totals_by_currency(
        &self,
        entity_type: &str,
        entity_id: Uuid,
        from: NaiveDate,
        to: NaiveDate,
    ) -> Result<Vec<CurrencyVatTotal>, sqlx::Error> {
        let sql = if entity_type == "PF" {
            r#"
            SELECT
                f.moneda                        AS currency,
                f.tip_tranzactie::text          AS tip_tranzactie,
                SUM(fl.valoare_fara_tva)::text  AS base,
                SUM(fl.valoare_tva)::text       AS vat
            FROM factura f
            JOIN factura_linie fl ON fl.factura_id = f.id
            WHERE f.stare = 'Platita'
              AND f.emitent_pf_id = $1
              AND f.data_emitere BETWEEN $2 AND $3
            GROUP BY f.moneda, f.tip_tranzactie
            "#
        } else {
            r#"
            SELECT
                f.moneda                        AS currency,
                f.tip_tranzactie::text          AS tip_tranzactie,
                SUM(fl.valoare_fara_tva)::text  AS base,
                SUM(fl.valoare_tva)::text       AS vat
            FROM factura f
            JOIN factura_linie fl ON fl.factura_id = f.id
            WHERE f.stare = 'Platita'
              AND f.emitent_pj_id = $1
              AND f.data_emitere BETWEEN $2 AND $3
            GROUP BY f.moneda, f.tip_tranzactie
            "#
        };

        let rows: Vec<CurrencyVatRow> = sqlx::query_as(sql)
            .bind(entity_id)
            .bind(from)
            .bind(to)
            .fetch_all(&self.pool)
            .await?;

        // Aggregate per currency
        let mut map: std::collections::HashMap<String, CurrencyVatTotal> =
            std::collections::HashMap::new();

        for r in rows {
            let base = Decimal::from_str(&r.base.unwrap_or_default()).unwrap_or(Decimal::ZERO);
            let vat = Decimal::from_str(&r.vat.unwrap_or_default()).unwrap_or(Decimal::ZERO);
            let entry = map.entry(r.currency.clone()).or_insert(CurrencyVatTotal {
                currency: r.currency,
                income_base: Decimal::ZERO,
                income_vat: Decimal::ZERO,
                expense_base: Decimal::ZERO,
                expense_vat: Decimal::ZERO,
            });
            if r.tip_tranzactie.as_deref() == Some("Venit") {
                entry.income_base += base;
                entry.income_vat += vat;
            } else {
                entry.expense_base += base;
                entry.expense_vat += vat;
            }
        }

        Ok(map.into_values().collect())
    }

    /// Per-invoice base + VAT totals for ZK circuit inputs.
    /// Returns one row per invoice (not per line), with the invoice's currency.
    pub async fn invoice_amounts_for_zk(
        &self,
        entity_type: &str,
        entity_id: Uuid,
        from: NaiveDate,
        to: NaiveDate,
    ) -> Result<Vec<InvoiceZkRow>, sqlx::Error> {
        let sql = if entity_type == "PF" {
            r#"
            SELECT
                f.tip_tranzactie::text  AS tip_tranzactie,
                f.moneda                AS currency,
                SUM(fl.valoare_fara_tva)::text AS base,
                SUM(fl.valoare_tva)::text      AS vat
            FROM factura f
            JOIN factura_linie fl ON fl.factura_id = f.id
            WHERE f.stare = 'Platita'
              AND f.emitent_pf_id = $1
              AND f.data_emitere BETWEEN $2 AND $3
            GROUP BY f.id, f.tip_tranzactie, f.moneda
            "#
        } else {
            r#"
            SELECT
                f.tip_tranzactie::text  AS tip_tranzactie,
                f.moneda                AS currency,
                SUM(fl.valoare_fara_tva)::text AS base,
                SUM(fl.valoare_tva)::text      AS vat
            FROM factura f
            JOIN factura_linie fl ON fl.factura_id = f.id
            WHERE f.stare = 'Platita'
              AND f.emitent_pj_id = $1
              AND f.data_emitere BETWEEN $2 AND $3
            GROUP BY f.id, f.tip_tranzactie, f.moneda
            "#
        };

        let rows: Vec<InvoiceZkDbRow> = sqlx::query_as(sql)
            .bind(entity_id)
            .bind(from)
            .bind(to)
            .fetch_all(&self.pool)
            .await?;

        Ok(rows
            .into_iter()
            .map(|r| InvoiceZkRow {
                tip_tranzactie: r.tip_tranzactie.unwrap_or_default(),
                currency: r.currency,
                base: Decimal::from_str(&r.base.unwrap_or_default()).unwrap_or(Decimal::ZERO),
                vat: Decimal::from_str(&r.vat.unwrap_or_default()).unwrap_or(Decimal::ZERO),
            })
            .collect())
    }
}

pub type DynReportService = Arc<ReportService>;
