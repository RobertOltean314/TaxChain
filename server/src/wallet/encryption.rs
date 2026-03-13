use aes_gcm::aead::rand_core::RngCore;
use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit, OsRng},
};
use base64::{Engine, engine::general_purpose::STANDARD as B64};
use ethers::utils::hex;
use thiserror::Error;

const IV_LEN: usize = 12;

#[derive(Debug, Error)]
pub enum WalletEncryptionError {
    #[error("WALLET_ENCRYPTION_KEY env var missing or empty")]
    MissingKey,

    #[error("WALLET_ENCRYPTION_KEY must be 64 hex chars (32 bytes), got {0} chars")]
    InvalidKeyLength(usize),

    #[error("Failed to decode hex key: {0}")]
    HexDecodeKey(#[from] hex::FromHexError),

    #[error("AES-GCM encryption failed")]
    EncryptionFailed,

    #[error("AES-GCM decryption failed — wrong key or corrupted ciphertext")]
    DecryptionFailed,

    #[error("Failed to decode base64 blob: {0}")]
    Base64Decode(#[from] base64::DecodeError),

    #[error("Encrypted blob too short to contain IV (need >{IV_LEN} bytes, got {0})")]
    BlobTooShort(usize),
}

/// Loads and validates the 32-byte master key from the environment.
fn load_master_key() -> Result<[u8; 32], WalletEncryptionError> {
    let hex_key =
        std::env::var("WALLET_ENCRYPTION_KEY").map_err(|_| WalletEncryptionError::MissingKey)?;

    if hex_key.is_empty() {
        return Err(WalletEncryptionError::MissingKey);
    }

    if hex_key.len() != 64 {
        return Err(WalletEncryptionError::InvalidKeyLength(hex_key.len()));
    }

    let key_bytes = hex::decode(&hex_key)?;
    let mut key = [0u8; 32];
    key.copy_from_slice(&key_bytes);
    Ok(key)
}

/// Encrypt a private key hex string.
///
/// # Arguments
/// * `private_key_hex` — `0x`-prefixed 66-char hex private key from [`super::generator`]
/// * `master_key_hex`  — optional override; if `None` reads `WALLET_ENCRYPTION_KEY` env var
///
/// # Returns
/// `base64(12-byte IV || ciphertext || 16-byte tag)` — safe to store directly in the DB column.
pub fn encrypt_private_key(
    private_key_hex: &str,
    master_key_hex: Option<&str>,
) -> Result<String, WalletEncryptionError> {
    let key_bytes = match master_key_hex {
        Some(k) => {
            if k.len() != 64 {
                return Err(WalletEncryptionError::InvalidKeyLength(k.len()));
            }
            let decoded = hex::decode(k)?;
            let mut arr = [0u8; 32];
            arr.copy_from_slice(&decoded);
            arr
        }
        None => load_master_key()?,
    };

    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|_| WalletEncryptionError::EncryptionFailed)?;

    // Generate random 12-byte IV
    let mut iv_bytes = [0u8; IV_LEN];
    OsRng.fill_bytes(&mut iv_bytes);
    let nonce = Nonce::from_slice(&iv_bytes);

    // Encrypt (aes-gcm appends 16-byte auth tag to ciphertext automatically)
    let ciphertext = cipher
        .encrypt(nonce, private_key_hex.as_bytes())
        .map_err(|_| WalletEncryptionError::EncryptionFailed)?;

    // Assemble: IV || ciphertext (which already contains the appended tag)
    let mut blob = Vec::with_capacity(IV_LEN + ciphertext.len());
    blob.extend_from_slice(&iv_bytes);
    blob.extend_from_slice(&ciphertext);

    Ok(B64.encode(&blob))
}

/// Decrypt a private key from its base64 encrypted blob.
///
/// # Arguments
/// * `encrypted_blob` — the value stored in `assigned_wallet_key_enc`
/// * `master_key_hex` — optional override; if `None` reads `WALLET_ENCRYPTION_KEY` env var
///
/// # Returns
/// The original `0x`-prefixed private key hex string.
pub fn decrypt_private_key(
    encrypted_blob: &str,
    master_key_hex: Option<&str>,
) -> Result<String, WalletEncryptionError> {
    let key_bytes = match master_key_hex {
        Some(k) => {
            if k.len() != 64 {
                return Err(WalletEncryptionError::InvalidKeyLength(k.len()));
            }
            let decoded = hex::decode(k)?;
            let mut arr = [0u8; 32];
            arr.copy_from_slice(&decoded);
            arr
        }
        None => load_master_key()?,
    };

    let blob = B64.decode(encrypted_blob)?;

    if blob.len() <= IV_LEN {
        return Err(WalletEncryptionError::BlobTooShort(blob.len()));
    }

    let (iv_bytes, ciphertext) = blob.split_at(IV_LEN);
    let nonce = Nonce::from_slice(iv_bytes);

    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|_| WalletEncryptionError::DecryptionFailed)?;

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| WalletEncryptionError::DecryptionFailed)?;

    String::from_utf8(plaintext).map_err(|_| WalletEncryptionError::DecryptionFailed)
}
