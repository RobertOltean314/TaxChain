/**
 * Zero-Knowledge Proof Feature Models
 * Maps to zk-proof-service and common-types
 */

/**
 * ZK Proof Request
 * Maps to ZkProofRequest in Rust common-types
 */
export interface ZkProofRequest {
  income: number;
  expenses: number;
  tax_owed: number;
  calculation_id: string;
}

/**
 * ZK Proof Response
 * Maps to ZkProofResponse in Rust common-types
 */
export interface ZkProofResponse {
  proof_generated: boolean;
  proof_hash?: string;
  verification_key?: string;
  timestamp: string;
  calculation_id: string;
}

/**
 * ZK Proof Verification Request
 * Maps to ZkProofVerificationRequest in Rust common-types
 */
export interface ZkProofVerificationRequest {
  proof_hash: string;
  verification_key: string;
  public_inputs: string[];
}

/**
 * ZK Proof Verification Response
 * Maps to ZkProofVerificationResponse in Rust common-types
 */
export interface ZkProofVerificationResponse {
  is_valid: boolean;
  verified_at: string;
}
