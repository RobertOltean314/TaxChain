use ethers::{
    signers::{LocalWallet, Signer},
    utils::{hex, to_checksum},
};
use rand::thread_rng;

use crate::wallet::{WalletEncryptionError, encryption::encrypt_private_key};

pub fn generate_custodial_wallet() -> Result<(String, String), WalletEncryptionError> {
    // 1. Generate wallet
    let wallet = LocalWallet::new(&mut thread_rng());

    // 2. EIP-55 checksummed address
    let wallet_address = to_checksum(&wallet.address(), None);

    // 3. Generate private key from wallet address
    let private_key_hex = format!("0x{}", hex::encode(wallet.signer().to_bytes()));

    // 4. Encrypt the private key
    let private_key_enc = encrypt_private_key(&private_key_hex, None)?;

    Ok((wallet_address, private_key_enc))
}
