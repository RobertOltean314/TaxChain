use chrono::{Duration, Utc};
use ethers::{
    core::types::{RecoveryMessage, Signature},
    utils::hex,
};
use rand::Rng;

use crate::models::AuthNonce;

const NONCE_TTL_SECONDS: i64 = 300; // 300/60 = 5 minutes

pub fn generate_nonce(wallet_address: &str) -> AuthNonce {
    let random_bytes: [u8; 16] = rand::thread_rng().r#gen();
    let nonce_value = hex::encode(random_bytes);

    let nonce = format!(
        "TaxChain wants you to sign in with your Ethereum account:\n\
         {wallet_address}\n\n\
         Sign in to TaxChain\n\n\
         Nonce: {nonce_value}"
    );

    AuthNonce {
        wallet_address: wallet_address.to_string(),
        nonce,
        expires_at: Utc::now() + Duration::seconds(NONCE_TTL_SECONDS),
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SiweError {
    #[error("Nonce not found for address {0}")]
    NonceNotFound(String),
    #[error("Nonce has expired")]
    NonceExpired,
    #[error("Signature is invalid: {0}")]
    InvalidSignature(String),
    #[error("Recovered address {recovered} does not match claimed address {claimed}")]
    AddressMismatch { recovered: String, claimed: String },
}

pub fn verify_siwe_signature(
    claimed_address: &str,
    signature_hex: &str,
    stored_nonce: &AuthNonce,
) -> Result<(), SiweError> {
    // 1. Check expiration
    if Utc::now() > stored_nonce.expires_at {
        return Err(SiweError::NonceExpired);
    }

    // 2. Parse signiture
    let signiture_bytes = hex::decode(signature_hex.trim_start_matches("0x"))
        .map_err(|e| SiweError::InvalidSignature(e.to_string()))?;

    let signature = Signature::try_from(signiture_bytes.as_slice())
        .map_err(|e| SiweError::InvalidSignature(e.to_string()))?;

    // 3. Recover the signer address
    let message = RecoveryMessage::Data(stored_nonce.nonce.as_bytes().to_vec());

    let recovered = signature
        .recover(message)
        .map_err(|e| SiweError::InvalidSignature(e.to_string()))?;

    // 4. Compared recovered address with the claimed address
    let recovered_hex = format!("{recovered:#x}"); // "0x..." lowercase
    let claimed_normalized = claimed_address.to_lowercase();
    let recovered_normalized = recovered_hex.to_lowercase();

    if claimed_normalized != recovered_normalized {
        return Err(SiweError::AddressMismatch {
            recovered: recovered_normalized,
            claimed: claimed_normalized,
        });
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nonce_contains_wallet_address() {
        let address = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12";
        let nonce = generate_nonce(address);
        assert!(nonce.nonce.contains(address));
    }

    #[test]
    fn nonce_expires_in_future() {
        let nonce = generate_nonce("0x0000000000000000000000000000000000000000");
        assert!(nonce.expires_at > Utc::now());
    }

    #[test]
    fn expired_nonce_is_rejected() {
        let stored = AuthNonce {
            wallet_address: "0x0000000000000000000000000000000000000000".to_string(),
            nonce: "TaxChain wants you to sign in...".to_string(),
            expires_at: Utc::now() - Duration::seconds(1), // already expired
        };

        let result = verify_siwe_signature(
            "0x0000000000000000000000000000000000000000",
            "0x00",
            &stored,
        );
        assert!(matches!(result, Err(SiweError::NonceExpired)));
    }
}
