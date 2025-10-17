use common_types::{
    ZkProofRequest, ZkProofResponse, ZkProofVerificationRequest, ZkProofVerificationResponse,
};
use chrono::Utc;
use sha2::{Sha256, Digest};
use std::collections::HashMap;
use tokio::sync::RwLock;
use anyhow::Result;

pub struct ZkProofService {
    // TODO: RN we save in memory, will migrate to a DB
    proof_storage: RwLock<HashMap<String, ZkProofResponse>>,
}

impl ZkProofService {
    pub fn new() -> Self {
        Self {
            proof_storage: RwLock::new(HashMap::new()),
        }
    }

    pub async fn generate_proof(&self, request: ZkProofRequest) -> Result<ZkProofResponse> {
        tracing::info!("Starting ZK proof generation for calculation: {}", request.calculation_id);
        
        // TODO: RN we simulat ZK geenration. Will migrate to Circom generation later
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        
        let proof_hash = self.generate_proof_hash(&request);
        let verification_key = self.generate_verification_key(&request);
        
        let response = ZkProofResponse {
            proof_generated: true,
            proof_hash: Some(proof_hash.clone()),
            verification_key: Some(verification_key),
            timestamp: Utc::now().to_rfc3339(),
            calculation_id: request.calculation_id.clone(),
        };
        
        // TODO: Migrate to a DB this kind of storage
        let mut storage = self.proof_storage.write().await;
        storage.insert(request.calculation_id.clone(), response.clone());
        
        tracing::info!("ZK proof generated successfully: {}", proof_hash);
        Ok(response)
    }

    pub async fn verify_proof(&self, request: ZkProofVerificationRequest) -> Result<ZkProofVerificationResponse> {
        tracing::info!("Verifying ZK proof: {}", request.proof_hash);
        
        // TODO: Implement actual ZK verification
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        
        // For this simulation, we'll consider proof valid if it exists in our storage
        let storage = self.proof_storage.read().await;
        let is_valid = storage.values().any(|proof| {
            proof.proof_hash.as_ref() == Some(&request.proof_hash) &&
            proof.verification_key.as_ref() == Some(&request.verification_key)
        });
        
        Ok(ZkProofVerificationResponse {
            is_valid,
            verified_at: Utc::now().to_rfc3339(),
        })
    }

    pub async fn get_proof_by_calculation_id(&self, calculation_id: &str) -> Result<Option<ZkProofResponse>> {
        //TODO: Implement DB storage by ID
        let storage = self.proof_storage.read().await;
        Ok(storage.get(calculation_id).cloned())
    }

    fn generate_proof_hash(&self, request: &ZkProofRequest) -> String {
        let mut hasher = Sha256::new();
        hasher.update(request.income.to_string().as_bytes());
        hasher.update(request.expenses.to_string().as_bytes());
        hasher.update(request.tax_owed.to_string().as_bytes());
        hasher.update(request.calculation_id.as_bytes());
        
        let result = hasher.finalize();
        format!("zkproof_{:x}", result)
    }

    fn generate_verification_key(&self, request: &ZkProofRequest) -> String {
        let mut hasher = Sha256::new();
        hasher.update("verification_key".as_bytes());
        hasher.update(request.calculation_id.as_bytes());
        
        let result = hasher.finalize();
        format!("vk_{:x}", result)
    }
}

impl Default for ZkProofService {
    fn default() -> Self {
        Self::new()
    }
}