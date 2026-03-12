use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::UserRole;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuthNonce {
    pub wallet_address: String,
    pub nonce: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RefreshToken {
    pub id: Uuid,
    pub user_id: Uuid,
    pub token_hash: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user uuid
    pub wallet: String,
    pub role: UserRole,
    pub iat: i64,
    pub exp: i64,
}

impl Claims {
    pub fn new(user_id: Uuid, wallet: String, role: UserRole, ttl_seconds: i64) -> Self {
        let now = Utc::now().timestamp();

        Self {
            sub: user_id.to_string(),
            wallet,
            role,
            iat: now,
            exp: now + ttl_seconds,
        }
    }

    pub fn user_id(&self) -> Result<Uuid, uuid::Error> {
        Uuid::parse_str(&self.sub)
    }
}
