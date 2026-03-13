use ethers::utils::hex;
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use rand::Rng;
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::models::{Claims, UserRole};

pub fn encode_token(
    user_id: Uuid,
    wallet: String,
    role: UserRole,
    persoana_fizica_id: Option<Uuid>,
    persoana_juridica_id: Option<Uuid>,
    secret: &str,
    ttl_seconds: i64,
) -> Result<String, jsonwebtoken::errors::Error> {
    let claims = Claims::new(
        user_id,
        persoana_fizica_id,
        persoana_juridica_id,
        wallet,
        role,
        ttl_seconds,
    );
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

pub fn decode_token(token: &str, secret: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let mut validation = Validation::default();
    validation.leeway = 0;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )?;
    Ok(token_data.claims)
}

pub fn generate_refresh_token() -> String {
    let bytes: [u8; 32] = rand::thread_rng().r#gen();
    hex::encode(bytes)
}

pub fn hash_refresh_token(raw_token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(raw_token.as_bytes());
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &str = "test-secret-do-not-use-in-production";

    #[test]
    fn encode_then_decode_round_trip() {
        let user_id = Uuid::new_v4();
        let wallet = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12".to_string();
        let role = UserRole::Taxpayer;
        let pf_id = Uuid::new_v4();

        let token = encode_token(
            user_id,
            wallet.clone(),
            role,
            Some(pf_id),
            None,
            TEST_SECRET,
            3600,
        )
        .expect("encode should succeed");

        let claims = decode_token(&token, TEST_SECRET).expect("decode should succeed");

        assert_eq!(claims.user_id().unwrap(), user_id);
        assert_eq!(claims.wallet, wallet);
        assert_eq!(claims.role, UserRole::Taxpayer);
        assert_eq!(claims.persoana_fizica_id, Some(pf_id));
        assert_eq!(claims.persoana_juridica_id, None);
    }

    #[test]
    fn entity_ids_are_none_when_not_linked() {
        let token = encode_token(
            Uuid::new_v4(),
            "0x0000000000000000000000000000000000000000".to_string(),
            UserRole::Taxpayer,
            None,
            None,
            TEST_SECRET,
            3600,
        )
        .expect("encode should succeed");

        let claims = decode_token(&token, TEST_SECRET).expect("decode should succeed");

        assert_eq!(claims.persoana_fizica_id, None);
        assert_eq!(claims.persoana_juridica_id, None);
    }

    #[test]
    fn both_entity_ids_survive_round_trip() {
        let pf_id = Uuid::new_v4();
        let pj_id = Uuid::new_v4();

        let token = encode_token(
            Uuid::new_v4(),
            "0x0000000000000000000000000000000000000000".to_string(),
            UserRole::Admin,
            Some(pf_id),
            Some(pj_id),
            TEST_SECRET,
            3600,
        )
        .expect("encode should succeed");

        let claims = decode_token(&token, TEST_SECRET).expect("decode should succeed");

        assert_eq!(claims.persoana_fizica_id, Some(pf_id));
        assert_eq!(claims.persoana_juridica_id, Some(pj_id));
    }

    #[test]
    fn expired_token_is_rejected() {
        let user_id = Uuid::new_v4();
        let token = encode_token(
            user_id,
            "0x0000000000000000000000000000000000000000".to_string(),
            UserRole::Taxpayer,
            None,
            None,
            TEST_SECRET,
            -1, // already expired
        )
        .expect("encode should succeed");

        let result = decode_token(&token, TEST_SECRET);
        assert!(result.is_err(), "expired token must be rejected");
    }

    #[test]
    fn wrong_secret_is_rejected() {
        let token = encode_token(
            Uuid::new_v4(),
            "0x0000000000000000000000000000000000000000".to_string(),
            UserRole::Admin,
            None,
            None,
            TEST_SECRET,
            3600,
        )
        .expect("encode should succeed");

        let result = decode_token(&token, "wrong-secret");
        assert!(result.is_err(), "wrong secret must be rejected");
    }

    #[test]
    fn refresh_token_hash_is_deterministic() {
        let raw = generate_refresh_token();
        assert_eq!(hash_refresh_token(&raw), hash_refresh_token(&raw));
    }

    #[test]
    fn different_raw_tokens_produce_different_hashes() {
        let a = generate_refresh_token();
        let b = generate_refresh_token();
        assert_ne!(hash_refresh_token(&a), hash_refresh_token(&b));
    }
}
