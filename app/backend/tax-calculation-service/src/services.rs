use common_types::{
    TaxCalculationRequest, TaxCalculationResponse, TaxBreakdown,
    InvoiceType, CountryCode, ZkProofRequest,
};
use chrono::Utc;
use uuid::Uuid;
use anyhow::Result;

pub struct TaxCalculationService {
    zk_proof_service_url: String,
}

impl TaxCalculationService {
    pub fn new() -> Self {
        Self {
            zk_proof_service_url: std::env::var("ZK_PROOF_SERVICE_URL")
                .unwrap_or_else(|_| "http://zk-proof-service:8004".to_string()),
        }
    }

    pub async fn calculate_tax(
        &self,
        request: TaxCalculationRequest,
    ) -> Result<TaxCalculationResponse> {
        if request.invoice_data.invoices.is_empty() {
            return Err(anyhow::anyhow!("No invoices provided"));
        }

        let (total_income, total_expenses) = self.calculate_totals(&request);

        let profit = total_income - total_expenses;
        //TODO: Check for negative profit. THIS SHOULD WORK AS WELL FOR NEGATIVE PROFIT!!!
        if profit < 0.0 {
            return Err(anyhow::anyhow!(
                "Negative profit not allowed. Expenses cannot exceed income."
            ));
        }

        let country_code = request.country_code.unwrap_or(CountryCode::RO);
        let tax_rates = self.get_tax_rates_for_country(&country_code);
        
        let tax_owed = profit * tax_rates.income_tax_rate;
        let breakdown = self.calculate_tax_breakdown(profit, &tax_rates);

        let calculation_id = Uuid::new_v4().to_string();

        // Request ZK proof generation
        let zk_proof_generated = self.request_zk_proof_generation(
            total_income,
            total_expenses,
            tax_owed,
            &calculation_id,
        ).await.unwrap_or(false);

        Ok(TaxCalculationResponse {
            total_income,
            total_expenses,
            profit,
            tax_owed,
            tax_rate: tax_rates.income_tax_rate,
            zk_proof_generated,
            calculation_id,
            timestamp: Utc::now().to_rfc3339(),
            breakdown,
        })
    }

    // TODO: Take a look on those functions. This should work for all countries. Maybe store those info inside DB
    pub async fn get_available_tax_rates(&self) -> Result<serde_json::Value> {
        Ok(serde_json::json!({
            "countries": [
                {
                    "code": "RO",
                    "name": "Romania",
                    "income_tax_rate": 0.10,
                    "social_security_rate": 0.25,
                    "health_insurance_rate": 0.10
                },
                {
                    "code": "US",
                    "name": "United States",
                    "income_tax_rate": 0.22,
                    "social_security_rate": 0.062,
                    "health_insurance_rate": 0.0145
                }
            ]
        }))
    }

    pub async fn get_tax_rates_by_country(&self, country_code: CountryCode) -> Result<serde_json::Value> {
        let rates = self.get_tax_rates_for_country(&country_code);
        
        Ok(serde_json::json!({
            "country_code": country_code,
            "income_tax_rate": rates.income_tax_rate,
            "social_security_rate": rates.social_security_rate,
            "health_insurance_rate": rates.health_insurance_rate,
            "last_updated": Utc::now().to_rfc3339()
        }))
    }

    fn calculate_totals(&self, request: &TaxCalculationRequest) -> (f64, f64) {
        let mut total_income = 0.0;
        let mut total_expenses = 0.0;

        for invoice in &request.invoice_data.invoices {
            match invoice.invoice_type {
                InvoiceType::Income => total_income += invoice.amount,
                InvoiceType::Expense => total_expenses += invoice.amount,
            }
        }

        (total_income, total_expenses)
    }

    // TODO: This should work for all countries available. For now only Romania
    fn get_tax_rates_for_country(&self, country_code: &CountryCode) -> TaxRates {
        match country_code {
            CountryCode::RO => TaxRates {
                income_tax_rate: 0.10,
                social_security_rate: 0.25,
                health_insurance_rate: 0.10,
            },
            CountryCode::US => TaxRates {
                income_tax_rate: 0.22,
                social_security_rate: 0.062,
                health_insurance_rate: 0.0145,
            },
            _ => TaxRates {
                income_tax_rate: 0.15,
                social_security_rate: 0.15,
                health_insurance_rate: 0.05,
            },
        }
    }

    fn calculate_tax_breakdown(&self, profit: f64, rates: &TaxRates) -> TaxBreakdown {
        TaxBreakdown {
            income_tax: profit * rates.income_tax_rate,
            social_security_tax: profit * rates.social_security_rate,
            health_insurance_tax: profit * rates.health_insurance_rate,
            other_taxes: 0.0,
        }
    }

    async fn request_zk_proof_generation(
        &self,
        income: f64,
        expenses: f64,
        tax_owed: f64,
        calculation_id: &str,
    ) -> Result<bool> {
        let client = reqwest::Client::new();
        let zk_request = ZkProofRequest {
            income,
            expenses,
            tax_owed,
            calculation_id: calculation_id.to_string(),
        };

        match client
            .post(&format!("{}/api/v1/generate", self.zk_proof_service_url))
            .json(&zk_request)
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    tracing::info!("ZK proof generation requested successfully");
                    Ok(true)
                } else {
                    tracing::warn!("ZK proof service returned error: {}", response.status());
                    Ok(false)
                }
            }
            Err(e) => {
                tracing::error!("Failed to contact ZK proof service: {}", e);
                Ok(false)
            }
        }
    }
}

#[derive(Debug)]
struct TaxRates {
    income_tax_rate: f64,
    social_security_rate: f64,
    health_insurance_rate: f64,
}