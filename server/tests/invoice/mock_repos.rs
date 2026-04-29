use std::io::{Error, ErrorKind};
use std::sync::Arc;

use async_trait::async_trait;
use chrono::Utc;
use rust_decimal::Decimal;
use uuid::Uuid;

use taxchain::models::{
    Invoice, InvoiceLine, InvoiceLineRequest, InvoiceStatus,
    auth_models::{AuthNonce, RefreshToken},
    user_model::User,
};
use taxchain::models::audit_model::{AuditLogEntry, CreateAuditEntry};
use taxchain::services::{
    audit_service::{AuditRepository, DynAuditRepository},
    invoice_service::{InvoiceRepository, InvoiceWithLines},
    user_service::{DynUserRepository, UserRepository},
};

use super::fixtures::{DRAFT_ID, ISSUED_ID, mock_draft_invoice, mock_issued_invoice, mock_invoice_line};

// ── Behaviour enum ────────────────────────────────────────────────────────────

pub enum InvoiceMockBehaviour {
    Normal,
    InternalServerError,
}

// ── MockInvoiceRepository ─────────────────────────────────────────────────────

pub struct MockInvoiceRepository {
    pub behaviour: InvoiceMockBehaviour,
}

fn db_err() -> sqlx::Error {
    sqlx::Error::Io(Error::new(ErrorKind::TimedOut, "mock: db error"))
}

#[async_trait]
impl InvoiceRepository for MockInvoiceRepository {
    async fn find_all_for_entity(
        &self,
        _user_id: Uuid,
        _entity_type: &str,
        _entity_id: Uuid,
    ) -> Result<Vec<Invoice>, sqlx::Error> {
        match self.behaviour {
            InvoiceMockBehaviour::InternalServerError => Err(db_err()),
            InvoiceMockBehaviour::Normal => Ok(vec![mock_draft_invoice(), mock_issued_invoice()]),
        }
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Invoice>, sqlx::Error> {
        match self.behaviour {
            InvoiceMockBehaviour::InternalServerError => Err(db_err()),
            InvoiceMockBehaviour::Normal => {
                if id == DRAFT_ID {
                    Ok(Some(mock_draft_invoice()))
                } else if id == ISSUED_ID {
                    Ok(Some(mock_issued_invoice()))
                } else {
                    Ok(None)
                }
            }
        }
    }

    async fn find_lines(&self, _invoice_id: Uuid) -> Result<Vec<InvoiceLine>, sqlx::Error> {
        Ok(vec![mock_invoice_line()])
    }

    async fn create(
        &self,
        invoice: Invoice,
        _lines: Vec<InvoiceLineRequest>,
    ) -> Result<InvoiceWithLines, sqlx::Error> {
        match self.behaviour {
            InvoiceMockBehaviour::InternalServerError => Err(db_err()),
            InvoiceMockBehaviour::Normal => Ok(InvoiceWithLines {
                invoice,
                lines: vec![mock_invoice_line()],
            }),
        }
    }

    async fn update(
        &self,
        _id: Uuid,
        invoice: Invoice,
        _lines: Vec<InvoiceLineRequest>,
        _user_id: Uuid,
    ) -> Result<Option<InvoiceWithLines>, sqlx::Error> {
        Ok(Some(InvoiceWithLines { invoice, lines: vec![] }))
    }

    async fn update_status(
        &self,
        id: Uuid,
        status: InvoiceStatus,
        _user_id: Uuid,
    ) -> Result<Option<Invoice>, sqlx::Error> {
        match self.behaviour {
            InvoiceMockBehaviour::InternalServerError => Err(db_err()),
            InvoiceMockBehaviour::Normal => {
                if id == DRAFT_ID || id == ISSUED_ID {
                    let mut inv = if id == DRAFT_ID {
                        mock_draft_invoice()
                    } else {
                        mock_issued_invoice()
                    };
                    inv.status = status;
                    Ok(Some(inv))
                } else {
                    Ok(None)
                }
            }
        }
    }

    async fn update_payment(
        &self,
        _id: Uuid,
        _amount: Decimal,
        _user_id: Uuid,
    ) -> Result<Option<Invoice>, sqlx::Error> {
        Ok(Some(mock_draft_invoice()))
    }

    async fn delete(&self, id: Uuid, _user_id: Uuid) -> Result<bool, sqlx::Error> {
        match self.behaviour {
            InvoiceMockBehaviour::InternalServerError => Err(db_err()),
            InvoiceMockBehaviour::Normal => Ok(id == DRAFT_ID || id == ISSUED_ID),
        }
    }

    async fn get_next_number_for_series(
        &self,
        _user_id: Uuid,
        series: &str,
    ) -> Result<String, sqlx::Error> {
        Ok(format!("{series}-2025-001"))
    }

    async fn update_anchor_info(
        &self,
        _id: Uuid,
        _tx_hash: &str,
        _block_number: i64,
    ) -> Result<Option<Invoice>, sqlx::Error> {
        Ok(Some(mock_draft_invoice()))
    }
}

// ── MockUserRepository ────────────────────────────────────────────────────────

pub struct MockUserRepository;

#[async_trait]
impl UserRepository for MockUserRepository {
    async fn find_by_id(&self, _user_id: Uuid) -> Result<Option<User>, sqlx::Error> {
        Ok(None)
    }
    async fn find_by_google_id(&self, _google_id: &str) -> Result<Option<User>, sqlx::Error> {
        Ok(None)
    }
    async fn find_by_wallet_address(
        &self,
        _wallet_address: &str,
    ) -> Result<Option<User>, sqlx::Error> {
        Ok(None)
    }
    async fn create(&self, user: User) -> Result<User, sqlx::Error> {
        Ok(user)
    }
    async fn update_entity_links(
        &self,
        _user_id: Uuid,
        _persoana_fizica_id: Option<Uuid>,
        _persoana_juridica_id: Option<Uuid>,
    ) -> Result<Option<User>, sqlx::Error> {
        Ok(None)
    }
    async fn upsert_nonce(
        &self,
        _wallet_address: &str,
        _nonce: &str,
        _expires_at: chrono::DateTime<Utc>,
    ) -> Result<(), sqlx::Error> {
        Ok(())
    }
    async fn find_nonce(&self, _wallet_address: &str) -> Result<Option<AuthNonce>, sqlx::Error> {
        Ok(None)
    }
    async fn delete_nonce(&self, _wallet_address: &str) -> Result<(), sqlx::Error> {
        Ok(())
    }
    async fn find_refresh_token_by_hash(
        &self,
        _token_hash: &str,
    ) -> Result<Option<RefreshToken>, sqlx::Error> {
        Ok(None)
    }
    async fn create_refresh_token(&self, _token: RefreshToken) -> Result<(), sqlx::Error> {
        Ok(())
    }
    async fn delete_refresh_token_by_hash(&self, _token_hash: &str) -> Result<(), sqlx::Error> {
        Ok(())
    }
    async fn delete_all_refresh_tokens_for_user(&self, _user_id: Uuid) -> Result<(), sqlx::Error> {
        Ok(())
    }
}

// ── MockAuditRepository ───────────────────────────────────────────────────────

pub struct MockAuditRepository;

#[async_trait]
impl AuditRepository for MockAuditRepository {
    async fn log(&self, _entry: CreateAuditEntry) -> Result<(), sqlx::Error> {
        Ok(())
    }
    async fn list(
        &self,
        _entity_type: Option<&str>,
        _entity_id: Option<Uuid>,
        _action_prefix: Option<&str>,
        _limit: i64,
        _offset: i64,
    ) -> Result<Vec<AuditLogEntry>, sqlx::Error> {
        Ok(vec![])
    }
}

// ── Helpers to build Arc'd repos ──────────────────────────────────────────────

pub fn mock_invoice_repo(behaviour: InvoiceMockBehaviour) -> taxchain::services::invoice_service::DynInvoiceRepository {
    Arc::new(MockInvoiceRepository { behaviour })
}

pub fn mock_user_repo() -> DynUserRepository {
    Arc::new(MockUserRepository)
}

pub fn mock_audit_repo() -> DynAuditRepository {
    Arc::new(MockAuditRepository)
}
