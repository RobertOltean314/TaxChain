use std::sync::Arc;

use ethers::{
    contract::abigen,
    middleware::SignerMiddleware,
    providers::{Http, Provider},
    signers::{LocalWallet, Signer},
    types::Address,
};
use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::models::{Invoice, InvoiceLine};

// ── Contract ABI ──────────────

abigen!(
    InvoiceRegistry,
    r#"[
        function anchorInvoice(bytes32 invoiceHash, string memo) external
        function anchorProof(bytes32 proofHash, bytes32 periodHash, string memo) external
        function isInvoiceAnchored(address issuer, bytes32 invoiceHash) external view returns (bool anchored, uint256 timestamp)
    ]"#
);

// ── Service ───────────────────────────────────────────────────────────────────

pub struct AnchorService {
    rpc_url: String,
    contract_address: Address,
}

pub type DynAnchorService = Arc<AnchorService>;

impl AnchorService {
    pub fn new(rpc_url: &str, contract_address: &str) -> Result<Self, AnchorError> {
        let addr = contract_address
            .parse::<Address>()
            .map_err(|e| AnchorError::Config(format!("Invalid contract address: {e}")))?;
        Ok(Self {
            rpc_url: rpc_url.to_string(),
            contract_address: addr,
        })
    }

    /// Hash an invoice + its lines into a deterministic bytes32.
    ///
    /// `transition` must be a unique label per anchoring event (e.g. "sent",
    /// "paid") so that two anchors for the same invoice produce distinct
    /// hashes and don't collide inside the contract's duplicate-anchor guard.
    pub fn compute_invoice_hash(invoice: &Invoice, lines: &[InvoiceLine], transition: &str) -> [u8; 32] {
        let canonical = serde_json::json!({
            "transition":   transition,
            "id":           invoice.id,
            "number":       invoice.number,
            "series":       invoice.series,
            "issued_date":  invoice.issued_date.to_string(),
            "due_date":     invoice.due_date.map(|d| d.to_string()),
            "currency":     invoice.currency,
            "total":        invoice.total.to_string(),
            "total_vat":    invoice.total_vat.to_string(),
            "partner_id":   invoice.partner_id,
            "lines": lines.iter().map(|l| serde_json::json!({
                "position":    l.position,
                "description": l.description,
                "quantity":    l.quantity.to_string(),
                "unit_price":  l.unit_price.to_string(),
                "vat_rate":    format!("{:?}", l.vat_rate),
            })).collect::<Vec<_>>()
        });
        let bytes = canonical.to_string().into_bytes();
        let mut hasher = Sha256::new();
        hasher.update(&bytes);
        hasher.finalize().into()
    }

    /// Anchor an invoice hash on Sepolia using the given custodial private key.
    ///
    /// Returns `(tx_hash_hex, block_number)` on success.
    /// Blocks until the transaction is confirmed (one block).
    pub async fn anchor_invoice(
        &self,
        invoice_hash: [u8; 32],
        private_key_hex: &str,
        memo: String,
    ) -> Result<(String, i64), AnchorError> {
        let (client, _wallet_addr) = self.build_client(private_key_hex)?;
        let contract = InvoiceRegistry::new(self.contract_address, client.clone());

        let call = contract.anchor_invoice(invoice_hash, memo).gas(200_000u64);
        let pending = call
            .send()
            .await
            .map_err(|e| AnchorError::Contract(e.to_string()))?;

        let receipt = pending
            .await
            .map_err(|e| AnchorError::Contract(e.to_string()))?
            .ok_or(AnchorError::NoReceipt)?;

        let tx_hash = format!("{:?}", receipt.transaction_hash);
        let block_number = receipt.block_number.ok_or(AnchorError::NoBlock)?.as_u64() as i64;

        Ok((tx_hash, block_number))
    }

    /// Anchor a ZK proof hash on Sepolia
    pub async fn anchor_proof(
        &self,
        proof_hash: [u8; 32],
        period_hash: [u8; 32],
        private_key_hex: &str,
        memo: String,
    ) -> Result<(String, i64), AnchorError> {
        let (client, _) = self.build_client(private_key_hex)?;
        let contract = InvoiceRegistry::new(self.contract_address, client);

        let call = contract.anchor_proof(proof_hash, period_hash, memo).gas(200_000u64);
        let pending = call
            .send()
            .await
            .map_err(|e| AnchorError::Contract(e.to_string()))?;

        let receipt = pending
            .await
            .map_err(|e| AnchorError::Contract(e.to_string()))?
            .ok_or(AnchorError::NoReceipt)?;

        let tx_hash = format!("{:?}", receipt.transaction_hash);
        let block_number = receipt.block_number.ok_or(AnchorError::NoBlock)?.as_u64() as i64;

        Ok((tx_hash, block_number))
    }

    fn build_client(
        &self,
        private_key_hex: &str,
    ) -> Result<(Arc<SignerMiddleware<Provider<Http>, LocalWallet>>, Address), AnchorError> {
        let provider = Provider::<Http>::try_from(self.rpc_url.as_str())
            .map_err(|e| AnchorError::Provider(e.to_string()))?;

        let wallet = private_key_hex
            .parse::<LocalWallet>()
            .map_err(|e| AnchorError::Wallet(e.to_string()))?
            .with_chain_id(11155111u64); // Sepolia

        let address = wallet.address();
        let client = Arc::new(SignerMiddleware::new(provider, wallet));
        Ok((client, address))
    }
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[derive(Debug, Error)]
pub enum AnchorError {
    #[error("Configuration error: {0}")]
    Config(String),
    #[error("Provider error: {0}")]
    Provider(String),
    #[error("Wallet error: {0}")]
    Wallet(String),
    #[error("Contract call error: {0}")]
    Contract(String),
    #[error("Transaction submitted but receipt was not returned")]
    NoReceipt,
    #[error("Transaction confirmed but block number missing from receipt")]
    NoBlock,
}
