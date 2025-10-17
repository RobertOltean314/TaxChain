use crate::dto::{CreateInvoiceRequest, InvoiceResponse};
use crate::models::Invoice;
use anyhow::{anyhow, Result};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

// In-memory storage (replace with database later)
// TODO: Review storage implementation for off/on chain transactions
lazy_static::lazy_static! {
    static ref INVOICE_STORE: Arc<Mutex<HashMap<Uuid, Invoice>>> = Arc::new(Mutex::new(HashMap::new()));
}

pub struct InvoiceService;

impl InvoiceService {
    pub fn new() -> Self {
        Self
    }

    pub async fn create_invoice(&self, request: CreateInvoiceRequest) -> Result<InvoiceResponse> {
        let invoice = Invoice::from_request(request)?;

        let mut store = INVOICE_STORE.lock().unwrap();
        store.insert(invoice.id, invoice.clone());

        Ok(InvoiceResponse::from_invoice(invoice))
    }

    pub async fn get_invoice(&self, id: Uuid) -> Result<InvoiceResponse> {
        let store = INVOICE_STORE.lock().unwrap();

        let invoice = store.get(&id).ok_or_else(|| anyhow!("Invoice not found"))?;

        Ok(InvoiceResponse::from_invoice(invoice.clone()))
    }

    pub async fn update_invoice(
        &self,
        id: Uuid,
        request: CreateInvoiceRequest,
    ) -> Result<InvoiceResponse> {
        let mut store = INVOICE_STORE.lock().unwrap();

        if !store.contains_key(&id) {
            return Err(anyhow!("Invoice not found"));
        }

        let mut invoice = Invoice::from_request(request)?;
        invoice.id = id; // Keep the same ID

        store.insert(id, invoice.clone());

        Ok(InvoiceResponse::from_invoice(invoice))
    }

    pub async fn delete_invoice(&self, id: Uuid) -> Result<()> {
        let mut store = INVOICE_STORE.lock().unwrap();

        store
            .remove(&id)
            .ok_or_else(|| anyhow!("Invoice not found"))?;

        Ok(())
    }

    pub async fn list_invoices(&self) -> Result<Vec<InvoiceResponse>> {
        let store = INVOICE_STORE.lock().unwrap();

        let invoices: Vec<InvoiceResponse> = store
            .values()
            .map(|inv| InvoiceResponse::from_invoice(inv.clone()))
            .collect();

        Ok(invoices)
    }

    pub async fn validate_invoice(&self, id: Uuid) -> Result<serde_json::Value> {
        let invoice = self.get_invoice(id).await?;

        // Basic validation logic
        // TODO: Implement Romanian incoive model validation
        let is_valid = !invoice.numar_serie.is_empty() && invoice.total_de_plata > 0.0;

        Ok(serde_json::json!({
            "is_valid": is_valid,
            "invoice_id": id,
            "errors": if is_valid { Vec::<String>::new() } else { vec!["Invalid invoice data".to_string()] }
        }))
    }
}
