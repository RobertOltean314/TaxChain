use common_types::{
    CreateInvoiceRequest, BusinessEntityValidationRequest, TaxCalculationRequest,
    InvoiceType, CountryCode,
};
use crate::handlers::{
    ValidationResponse, ComprehensiveValidationRequest, ComprehensiveValidationResponse,
};
use chrono::{Datelike, Utc};
use anyhow::Result;

pub struct ValidationService {
    business_entity_service_url: String,
}

impl ValidationService {
    pub fn new() -> Self {
        Self {
            business_entity_service_url: std::env::var("BUSINESS_ENTITY_SERVICE_URL")
                .unwrap_or_else(|_| "http://business-entity-service:8003".to_string()),
        }
    }

    pub async fn validate_invoice(&self, request: CreateInvoiceRequest) -> Result<ValidationResponse> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Validate required fields
        if request.numar_serie.trim().is_empty() {
            errors.push("Invoice number (numar_serie) is required".to_string());
        }

        if request.furnizor.trim().is_empty() {
            errors.push("Supplier (furnizor) is required".to_string());
        }

        if request.beneficiar.trim().is_empty() {
            errors.push("Beneficiary (beneficiar) is required".to_string());
        }

        // Validate amounts
        if request.total_valoare <= 0.0 {
            errors.push("Total value must be positive".to_string());
        }

        if request.total_tva < 0.0 {
            errors.push("Total VAT cannot be negative".to_string());
        }

        // Validate date
        if request.data_emiterii > Utc::now() {
            warnings.push("Invoice date is in the future".to_string());
        }

        // Business rule validations
        if request.total_tva > request.total_valoare {
            errors.push("VAT cannot exceed total value".to_string());
        }

        // Country-specific validations
        if let Some(country_code) = &request.country_code {
            match country_code {
                CountryCode::RO => {
                    if request.total_valoare > 10000.0 && request.total_tva == 0.0 {
                        warnings.push("High-value Romanian invoice without VAT should be reviewed".to_string());
                    }
                }
                _ => {}
            }
        }

        Ok(ValidationResponse {
            is_valid: errors.is_empty(),
            errors,
            warnings,
            validation_type: "invoice".to_string(),
        })
    }

    pub async fn validate_business_entity(&self, request: BusinessEntityValidationRequest) -> Result<ValidationResponse> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Basic validation
        if request.registration_number.trim().is_empty() {
            errors.push("Registration number is required".to_string());
        }

        if request.tax_id.trim().is_empty() {
            errors.push("Tax ID is required".to_string());
        }

        // Country-specific validation
        // TODO: Implement factory design patter for scalability
        match request.country_code {
            CountryCode::RO => {
                if !self.validate_romanian_tax_id(&request.tax_id) {
                    errors.push("Invalid Romanian tax ID format".to_string());
                }
                if !self.validate_romanian_registration_number(&request.registration_number) {
                    errors.push("Invalid Romanian registration number format".to_string());
                }
            }
            _ => {
                if request.tax_id.len() < 5 {
                    warnings.push("Tax ID seems unusually short".to_string());
                }
            }
        }

        // Try to validate with business entity service
        if let Err(e) = self.validate_with_business_entity_service(&request).await {
            warnings.push(format!("Could not validate with business entity service: {}", e));
        }

        Ok(ValidationResponse {
            is_valid: errors.is_empty(),
            errors,
            warnings,
            validation_type: "business_entity".to_string(),
        })
    }

    pub async fn validate_tax_calculation(&self, request: TaxCalculationRequest) -> Result<ValidationResponse> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Validate invoice data
        if request.invoice_data.invoices.is_empty() {
            errors.push("No invoices provided for tax calculation".to_string());
        }

        let mut total_income = 0.0;
        let mut total_expenses = 0.0;

        for (idx, invoice) in request.invoice_data.invoices.iter().enumerate() {
            if invoice.amount <= 0.0 {
                errors.push(format!("Invoice {} has non-positive amount", idx + 1));
            }

            match invoice.invoice_type {
                InvoiceType::Income => total_income += invoice.amount,
                InvoiceType::Expense => total_expenses += invoice.amount,
            }
        }

        // Business rule validations
        if total_income == 0.0 && total_expenses > 0.0 {
            warnings.push("Only expenses without any income detected".to_string());
        }

        // TODO: This should be ok. Maybe we'll remove this check
        if total_expenses > total_income {
            warnings.push("Expenses exceed income - this will result in zero tax".to_string());
        }

        // Validate tax year
        if let Some(tax_year) = request.tax_year {
            let current_year = Utc::now().year();
            if tax_year > current_year {
                errors.push("Tax year cannot be in the future".to_string());
            }
            if tax_year < current_year - 10 {
                warnings.push("Tax year is more than 10 years old".to_string());
            }
        }

        Ok(ValidationResponse {
            is_valid: errors.is_empty(),
            errors,
            warnings,
            validation_type: "tax_calculation".to_string(),
        })
    }

    // TODO: Check for Factory Implementation here
    pub async fn comprehensive_validation(&self, request: ComprehensiveValidationRequest) -> Result<ComprehensiveValidationResponse> {
        let mut invoice_validation = None;
        let mut business_entity_validation = None;
        let mut tax_calculation_validation = None;
        let cross_validation_errors = Vec::new();

        // Validate individual components
        if let Some(invoice) = request.invoice {
            invoice_validation = Some(self.validate_invoice(invoice).await?);
        }

        if let Some(business_entity) = request.business_entity {
            business_entity_validation = Some(self.validate_business_entity(business_entity).await?);
        }

        if let Some(tax_calculation) = request.tax_calculation {
            tax_calculation_validation = Some(self.validate_tax_calculation(tax_calculation).await?);
        }

        // Cross-validation rules
        // (Add specific business rules that span multiple components)

        let overall_valid = invoice_validation.as_ref().map_or(true, |v| v.is_valid)
            && business_entity_validation.as_ref().map_or(true, |v| v.is_valid)
            && tax_calculation_validation.as_ref().map_or(true, |v| v.is_valid)
            && cross_validation_errors.is_empty();

        Ok(ComprehensiveValidationResponse {
            overall_valid,
            invoice_validation,
            business_entity_validation,
            tax_calculation_validation,
            cross_validation_errors,
        })
    }

    fn validate_romanian_tax_id(&self, tax_id: &str) -> bool {
        let cleaned = tax_id.replace("RO", "");
        cleaned.chars().all(|c| c.is_ascii_digit()) && cleaned.len() >= 2 && cleaned.len() <= 10
    }

    fn validate_romanian_registration_number(&self, reg_number: &str) -> bool {
        if reg_number.starts_with('J') && reg_number.contains('/') {
            let parts: Vec<&str> = reg_number.split('/').collect();
            parts.len() >= 3
        } else {
            !reg_number.is_empty() && reg_number.len() > 5
        }
    }

    async fn validate_with_business_entity_service(&self, request: &BusinessEntityValidationRequest) -> Result<()> {
        let client = reqwest::Client::new();
        
        let response = client
            .post(&format!("{}/api/v1/validate", self.business_entity_service_url))
            .json(request)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(anyhow::anyhow!("Business entity service validation failed"))
        }
    }
}

impl Default for ValidationService {
    fn default() -> Self {
        Self::new()
    }
}