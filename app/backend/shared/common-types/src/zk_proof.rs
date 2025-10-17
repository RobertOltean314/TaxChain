use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZkProofRequest {
    pub income: f64,
    pub expenses: f64,
    pub tax_owed: f64,
    pub calculation_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZkProofResponse {
    pub proof_generated: bool,
    pub proof_hash: Option<String>,
    pub verification_key: Option<String>,
    pub timestamp: String,
    pub calculation_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZkProofVerificationRequest {
    pub proof_hash: String,
    pub verification_key: String,
    pub public_inputs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZkProofVerificationResponse {
    pub is_valid: bool,
    pub verified_at: String,
}