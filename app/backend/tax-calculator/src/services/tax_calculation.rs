use crate::dto::{ErrorResponse, InvoiceData, InvoiceTypeDto, TaxCalculationResponseDto};
use crate::services::zk_proof::generate_zk_proof;
use chrono::Utc;
use uuid::Uuid;

pub struct TaxCalculationService;

impl TaxCalculationService {
    pub fn new() -> Self {
        Self
    }

    pub async fn calculate_tax(
        &self,
        invoice_data: InvoiceData,
    ) -> Result<TaxCalculationResponseDto, ErrorResponse> {
        if invoice_data.invoices.is_empty() {
            return Err(ErrorResponse::new("No invoices provided").with_code("EMPTY_INVOICES"));
        }

        let (total_income, total_expenses) = self.calculate_totals(&invoice_data);

        let profit = total_income - total_expenses;
        if profit < 0.0 {
            return Err(ErrorResponse::new(
                "Negative profit not allowed. Expenses cannot exceed income.",
            )
            .with_code("NEGATIVE_PROFIT"));
        }

        let tax_rate = self.get_tax_rate();
        let tax_owed = profit * tax_rate;

        // Generate ZK proof
        let zk_proof_generated = generate_zk_proof(total_income, total_expenses, tax_owed).await;

        Ok(TaxCalculationResponseDto {
            total_income,
            total_expenses,
            profit,
            tax_owed,
            tax_rate,
            zk_proof_generated,
            calculation_id: Some(Uuid::new_v4().to_string()),
            timestamp: Utc::now().to_rfc3339(),
        })
    }

    fn calculate_totals(&self, invoice_data: &InvoiceData) -> (f64, f64) {
        let mut total_income = 0.0;
        let mut total_expenses = 0.0;

        for invoice in &invoice_data.invoices {
            match invoice.invoice_type {
                InvoiceTypeDto::Income => total_income += invoice.amount,
                InvoiceTypeDto::Expense => total_expenses += invoice.amount,
            }
        }

        (total_income, total_expenses)
    }

    fn get_tax_rate(&self) -> f64 {
        0.10 // 10%
    }
}
