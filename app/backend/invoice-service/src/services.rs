use crate::dto::{CreateInvoiceRequest, InvoiceResponse};
use crate::models::Invoice;
use anyhow::{anyhow, Result};
use rust_decimal::Decimal;
use sqlx::{PgPool, Row};
use uuid::Uuid;

pub struct InvoiceService {
    pool: PgPool,
}

// TODO: Review querries for DB migration.
impl InvoiceService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_invoice(&self, request: CreateInvoiceRequest) -> Result<InvoiceResponse> {
        let invoice = Invoice::from_request(request.clone())?;

        // Start a transaction
        let mut tx = self.pool.begin().await?;

        // Insert invoice
        sqlx::query(
            r#"
            INSERT INTO invoices (
                id, numar_serie, issue_date, furnizor_cui, cumparator_cui,
                baza_impozabila, total_tva, total_de_plata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(invoice.id)
        .bind(&invoice.numar_serie)
        .bind(invoice.issue_date)
        .bind(&invoice.furnizor_cui)
        .bind(&invoice.cumparator_cui)
        .bind(invoice.baza_impozabila)
        .bind(invoice.total_tva)
        .bind(invoice.total_de_plata)
        .execute(&mut *tx)
        .await?;

        // Insert line items
        for item in &request.line_items {
            sqlx::query(
                r#"
                INSERT INTO line_items (
                    invoice_id, description, quantity, unit_price,
                    total_price, tax_rate
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                "#,
            )
            .bind(invoice.id)
            .bind(&item.description)
            .bind(item.quantity)
            .bind(item.unit_price)
            .bind(item.total_price)
            .bind(item.tax_rate)
            .execute(&mut *tx)
            .await?;
        }

        // Commit transaction
        tx.commit().await?;

        tracing::info!("Created invoice with ID: {}", invoice.id);
        Ok(InvoiceResponse::from_invoice(invoice))
    }

    pub async fn get_invoice(&self, id: Uuid) -> Result<InvoiceResponse> {
        // Get invoice
        let invoice_row = sqlx::query(
            r#"
            SELECT id, numar_serie, issue_date, furnizor_cui, cumparator_cui,
                   baza_impozabila, total_tva, total_de_plata, created_at
            FROM invoices
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| anyhow!("Invoice not found"))?;

        let invoice = Invoice {
            id: invoice_row.try_get("id")?,
            numar_serie: invoice_row.try_get("numar_serie")?,
            issue_date: invoice_row.try_get("issue_date")?,
            furnizor_cui: invoice_row.try_get("furnizor_cui")?,
            cumparator_cui: invoice_row.try_get("cumparator_cui")?,
            baza_impozabila: invoice_row.try_get("baza_impozabila")?,
            total_tva: invoice_row.try_get("total_tva")?,
            total_de_plata: invoice_row.try_get("total_de_plata")?,
            created_at: invoice_row.try_get("created_at")?,
        };

        Ok(InvoiceResponse::from_invoice(invoice))
    }

    pub async fn update_invoice(
        &self,
        id: Uuid,
        request: CreateInvoiceRequest,
    ) -> Result<InvoiceResponse> {
        // Check if invoice exists
        let exists = sqlx::query("SELECT id FROM invoices WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .is_some();

        if !exists {
            return Err(anyhow!("Invoice not found"));
        }

        let invoice = Invoice::from_request(request.clone())?;

        // Start transaction
        let mut tx = self.pool.begin().await?;

        // Update invoice
        sqlx::query(
            r#"
            UPDATE invoices
            SET numar_serie = $2, issue_date = $3, furnizor_cui = $4,
                cumparator_cui = $5, baza_impozabila = $6, total_tva = $7,
                total_de_plata = $8, updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(&invoice.numar_serie)
        .bind(invoice.issue_date)
        .bind(&invoice.furnizor_cui)
        .bind(&invoice.cumparator_cui)
        .bind(invoice.baza_impozabila)
        .bind(invoice.total_tva)
        .bind(invoice.total_de_plata)
        .execute(&mut *tx)
        .await?;

        // Delete old line items
        sqlx::query("DELETE FROM line_items WHERE invoice_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // Insert new line items
        for item in &request.line_items {
            sqlx::query(
                r#"
                INSERT INTO line_items (
                    invoice_id, description, quantity, unit_price,
                    total_price, tax_rate
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                "#,
            )
            .bind(id)
            .bind(&item.description)
            .bind(item.quantity)
            .bind(item.unit_price)
            .bind(item.total_price)
            .bind(item.tax_rate)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        // Return updated invoice
        self.get_invoice(id).await
    }

    pub async fn delete_invoice(&self, id: Uuid) -> Result<()> {
        let result = sqlx::query("DELETE FROM invoices WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(anyhow!("Invoice not found"));
        }

        tracing::info!("Deleted invoice with ID: {}", id);
        Ok(())
    }

    pub async fn list_invoices(&self) -> Result<Vec<InvoiceResponse>> {
        let rows = sqlx::query(
            r#"
            SELECT id, numar_serie, issue_date, furnizor_cui, cumparator_cui,
                   baza_impozabila, total_tva, total_de_plata, created_at
            FROM invoices
            ORDER BY issue_date DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let mut results = Vec::new();

        for row in rows {
            let invoice = Invoice {
                id: row.try_get("id")?,
                numar_serie: row.try_get("numar_serie")?,
                issue_date: row.try_get("issue_date")?,
                furnizor_cui: row.try_get("furnizor_cui")?,
                cumparator_cui: row.try_get("cumparator_cui")?,
                baza_impozabila: row.try_get("baza_impozabila")?,
                total_tva: row.try_get("total_tva")?,
                total_de_plata: row.try_get("total_de_plata")?,
                created_at: row.try_get("created_at")?,
            };

            results.push(InvoiceResponse::from_invoice(invoice));
        }

        Ok(results)
    }

    pub async fn validate_invoice(&self, id: Uuid) -> Result<serde_json::Value> {
        let invoice = self.get_invoice(id).await?;

        // Basic validation logic
        let is_valid = !invoice.numar_serie.is_empty() && invoice.total_de_plata > Decimal::ZERO;

        Ok(serde_json::json!({
            "is_valid": is_valid,
            "invoice_id": id,
            "errors": if is_valid { Vec::<String>::new() } else { vec!["Invalid invoice data".to_string()] }
        }))
    }
}
