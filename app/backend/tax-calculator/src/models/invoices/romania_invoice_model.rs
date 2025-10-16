use std::collections::HashMap;

use chrono::{NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

use crate::models::entities::business_entity::BusinessEntity;
use crate::models::entities::RomanianBusinessEntity;
use crate::models::tax::ProfitTaxResult;
use crate::models::tva::TvaBreakdown;
use crate::models::{BaseInvoice, Invoice, InvoiceTotals, LineItem, ValidationError};

use sha2::{Digest, Sha256};
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RomanianInvoiceModel {
    pub base: BaseInvoice,

    // Specific for Romania
    pub numar_serie: String,
    pub furnizor: RomanianBusinessEntity,
    pub cumparator: RomanianBusinessEntity,

    pub baza_impozabila: Decimal,
    pub tva_detaliat: Vec<TvaBreakdown>,
    pub total_tva: Decimal,
    pub total_de_plata: Decimal,
    pub data_scadenta: Option<NaiveDate>,

    pub cod_anaf: Option<String>,
    pub hash_anaf: Option<String>,
}

impl RomanianInvoiceModel {
    pub fn new(
        numar_serie: String,
        furnizor: RomanianBusinessEntity,
        cumparator: RomanianBusinessEntity,
        line_items: Vec<LineItem>,
    ) -> Self {
        let (baza_impozabila, tva_detaliat, total_tva) = Self::calculate_vat(&line_items);
        let total_de_plata = baza_impozabila + total_tva;

        let totals = InvoiceTotals {
            subtotal: baza_impozabila,
            tax_amount: total_tva,
            total: total_de_plata,
            currency: "RON".to_string(),
        };

        let base = BaseInvoice {
            invoice_number: numar_serie.clone(),
            issue_date: Utc::now().date_naive(),
            due_date: None,
            line_items,
            totals,
            notes: None,
        };

        Self {
            base,
            numar_serie,
            furnizor,
            cumparator,
            baza_impozabila,
            tva_detaliat,
            total_tva,
            total_de_plata,
            data_scadenta: None,
            cod_anaf: None,
            hash_anaf: None,
        }
    }

    fn calculate_vat(line_items: &[LineItem]) -> (Decimal, Vec<TvaBreakdown>, Decimal) {
        let mut vat_groups: HashMap<String, (Decimal, Decimal)> = HashMap::new();
        let mut total_base = Decimal::ZERO;

        for item in line_items {
            let tax_rate = item.tax_rate.unwrap_or(Decimal::ZERO);
            let base_amount = item.total_price;
            let vat_amount = item.tax_amount.unwrap_or(Decimal::ZERO);

            total_base += base_amount;

            let rate_key = format!("{}", tax_rate);
            let entry = vat_groups
                .entry(rate_key)
                .or_insert((Decimal::ZERO, Decimal::ZERO));
            entry.0 += base_amount;
            entry.1 += vat_amount;
        }

        let mut tva_breakdown = Vec::new();
        let mut total_vat = Decimal::ZERO;

        for (rate_str, (base, vat)) in vat_groups {
            let rate = rate_str.parse::<Decimal>().unwrap_or(Decimal::ZERO);
            tva_breakdown.push(TvaBreakdown {
                cota_tva: rate,
                baza_impozabila: base,
                valoare_tva: vat,
            });
            total_vat += vat;
        }

        (total_base, tva_breakdown, total_vat)
    }

    fn validate_vat_calculations(&self) -> Result<(), ValidationError> {
        let (calculated_base, _, calculated_vat) = Self::calculate_vat(&self.base.line_items);

        if (self.baza_impozabila - calculated_base).abs() > Decimal::new(1, 2) {
            return Err(ValidationError::VatCalculationMismatch);
        }

        if (self.total_tva - calculated_vat).abs() > Decimal::new(1, 2) {
            return Err(ValidationError::VatCalculationMismatch);
        }

        // TODO: Solve this mismatch error
        Ok(())
    }

    fn validate_cui(&self) -> Result<(), ValidationError> {
        if !is_valid_cui(&self.furnizor.cui) {
            return Err(ValidationError::InvalidCUI(self.furnizor.cui.clone()));
        }
        if !is_valid_cui(&self.cumparator.cui) {
            return Err(ValidationError::InvalidCUI(self.cumparator.cui.clone()));
        }
        Ok(())
    }
}

fn is_valid_cui(cui: &str) -> bool {
    let clean_cui = cui.strip_prefix("RO").unwrap_or(cui);

    if clean_cui.len() < 2 || clean_cui.len() > 10 {
        return false;
    }

    if !clean_cui.chars().all(|c| c.is_ascii_digit()) {
        return false;
    }

    // TODO: Move to utils::validation::CuiValidator when module structure is fixed
    true
}

impl RomanianInvoiceModel {
    fn calculate_profit_tax(&self, expenses: Decimal) -> ProfitTaxResult {
        let revenue = self.total_de_plata;
        let profit = revenue - expenses;
        let tax_rate = Decimal::new(10, 2); // hard-coded for flat 10% for now
        let tax_amount = profit * tax_rate;

        ProfitTaxResult {
            revenue,
            expenses,
            profit,
            tax_rate,
            tax_amount,
            cui: self.furnizor.cui.clone(),
        }
    }

    fn validate_totals(&self) -> Result<(), ValidationError> {
        let expected_total = self.baza_impozabila + self.total_tva;
        if (self.total_de_plata - expected_total).abs() > Decimal::new(1, 2) {
            return Err(ValidationError::TotalMismatch);
        }
        Ok(())
    }
}

impl Invoice for RomanianInvoiceModel {
    fn get_invoice_number(&self) -> &str {
        &self.numar_serie
    }
    fn get_issue_date(&self) -> NaiveDate {
        self.base.issue_date
    }
    fn get_total_amount(&self) -> Decimal {
        self.total_de_plata
    }
    fn get_currency(&self) -> String {
        self.base.totals.currency.clone()
    }
    fn get_seller_info(&self) -> &dyn BusinessEntity {
        &self.furnizor
    }
    fn get_buyer_info(&self) -> &dyn BusinessEntity {
        &self.cumparator
    }
    fn get_line_items(&self) -> &[LineItem] {
        &self.base.line_items
    }
    fn calculate_hash(&self) -> String {
        let serialized = serde_json::to_string(self).unwrap();
        let mut hasher = Sha256::new();

        hasher.update(serialized.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn validate(&self) -> Result<(), ValidationError> {
        self.validate_cui()?;
        self.validate_vat_calculations()?;
        self.validate_totals()?;
        Ok(())
    }
}
