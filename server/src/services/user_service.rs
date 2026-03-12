use std::sync::Arc;

use async_trait::async_trait;
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{AuthNonce, RefreshToken, User, UserRow, row_to_user};

const INSERT_USER_QUERY: &str = "
    INSERT INTO users (
        id, google_id, wallet_address,
        assigned_wallet_address, assigned_wallet_key_enc,
        email, display_name, role, is_active,
        persoana_fizica_id, persoana_juridica_id,
        created_at, updated_at
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    )
    RETURNING
        id, google_id, wallet_address,
        assigned_wallet_address, assigned_wallet_key_enc,
        email, display_name, role, is_active,
        persoana_fizica_id, persoana_juridica_id,
        created_at, updated_at
";

const FIND_USER_BY_ID_QUERY: &str = "
    SELECT id, google_id, wallet_address,
           assigned_wallet_address, assigned_wallet_key_enc,
           email, display_name, role, is_active,
           persoana_fizica_id, persoana_juridica_id,
           created_at, updated_at
    FROM users WHERE id = $1
";

const FIND_USER_BY_GOOGLE_ID_QUERY: &str = "
    SELECT id, google_id, wallet_address,
           assigned_wallet_address, assigned_wallet_key_enc,
           email, display_name, role, is_active,
           persoana_fizica_id, persoana_juridica_id,
           created_at, updated_at
    FROM users WHERE google_id = $1
";

const FIND_USER_BY_WALLET_ADDRESS_QUERY: &str = "
    SELECT id, google_id, wallet_address,
           assigned_wallet_address, assigned_wallet_key_enc,
           email, display_name, role, is_active,
           persoana_fizica_id, persoana_juridica_id,
           created_at, updated_at
    FROM users WHERE wallet_address = $1
";

const UPDATE_USER_ENTITY_LINKS_QUERY: &str = "
    UPDATE users
    SET persoana_fizica_id = $2,
        persoana_juridica_id = $3,
        updated_at = $4
    WHERE id = $1
    RETURNING
        id, google_id, wallet_address,
        assigned_wallet_address, assigned_wallet_key_enc,
        email, display_name, role, is_active,
        persoana_fizica_id, persoana_juridica_id,
        created_at, updated_at
";

// -- Nonces --

const UPSERT_NONCE_QUERY: &str = "
    INSERT INTO auth_nonces (wallet_address, nonce, expires_at)
    VALUES ($1, $2, $3)
    ON CONFLICT (wallet_address) DO UPDATE
        SET nonce = EXCLUDED.nonce,
            expires_at = EXCLUDED.expires_at
";

const FIND_NONCE_QUERY: &str = "
    SELECT wallet_address, nonce, expires_at
    FROM auth_nonces WHERE wallet_address = $1
";

const DELETE_NONCE_QUERY: &str = "
    DELETE FROM auth_nonces WHERE wallet_address = $1
";

// -- Refresh tokens --

const INSERT_REFRESH_TOKEN_QUERY: &str = "
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
    VALUES ($1, $2, $3, $4, $5)
";

const FIND_REFRESH_TOKEN_BY_HASH_QUERY: &str = "
    SELECT id, user_id, token_hash, expires_at, created_at
    FROM refresh_tokens WHERE token_hash = $1
";

const DELETE_REFRESH_TOKEN_BY_HASH_QUERY: &str = "
    DELETE FROM refresh_tokens WHERE token_hash = $1
";

const DELETE_ALL_REFRESH_TOKENS_FOR_USER_QUERY: &str = "
    DELETE FROM refresh_tokens WHERE user_id = $1
";

#[async_trait]
pub trait UserRepository: Send + Sync {
    // -- User CRUD operations --
    async fn find_by_id(&self, user_id: Uuid) -> Result<Option<User>, sqlx::Error>;
    async fn find_by_google_id(&self, google_id: &str) -> Result<Option<User>, sqlx::Error>;
    async fn find_by_wallet_address(
        &self,
        wallet_address: &str,
    ) -> Result<Option<User>, sqlx::Error>;
    async fn create(&self, user: User) -> Result<User, sqlx::Error>;
    async fn update_entity_links(
        &self,
        user_id: Uuid,
        persoana_fizica_id: Option<Uuid>,
        persoana_juridica_id: Option<Uuid>,
    ) -> Result<Option<User>, sqlx::Error>;

    // -- Auth Nonces --
    async fn upsert_nonce(
        &self,
        wallet_address: &str,
        nonce: &str,
        expires_at: chrono::DateTime<Utc>,
    ) -> Result<(), sqlx::Error>;
    async fn find_nonce(&self, wallet_address: &str) -> Result<Option<AuthNonce>, sqlx::Error>;
    async fn delete_nonce(&self, wallet_address: &str) -> Result<(), sqlx::Error>;

    // -- Refresh Tokens --
    async fn find_refresh_token_by_hash(
        &self,
        token_hash: &str,
    ) -> Result<Option<RefreshToken>, sqlx::Error>;
    async fn create_refresh_token(&self, token: RefreshToken) -> Result<(), sqlx::Error>;
    async fn delete_refresh_token_by_hash(&self, token_hash: &str) -> Result<(), sqlx::Error>;
    async fn delete_all_refresh_tokens_for_user(&self, user_id: Uuid) -> Result<(), sqlx::Error>;
}

pub type DynUserRepository = Arc<dyn UserRepository>;

pub struct PgUserRepository {
    pool: PgPool,
}

impl PgUserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl UserRepository for PgUserRepository {
    // -- User CRUD operations --
    async fn create(&self, user: User) -> Result<User, sqlx::Error> {
        let row = sqlx::query_as::<_, UserRow>(INSERT_USER_QUERY)
            .bind(user.id)
            .bind(&user.google_id)
            .bind(&user.wallet_address)
            .bind(&user.assigned_wallet_address)
            .bind(&user.assigned_wallet_key_enc)
            .bind(&user.email)
            .bind(&user.display_name)
            .bind(user.role.as_str())
            .bind(user.is_active)
            .bind(user.persoana_fizica_id)
            .bind(user.persoana_juridica_id)
            .bind(user.created_at)
            .bind(user.updated_at)
            .fetch_one(&self.pool)
            .await?;

        row_to_user(row)
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, sqlx::Error> {
        let row = sqlx::query_as::<_, UserRow>(FIND_USER_BY_ID_QUERY)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        row.map(row_to_user).transpose()
    }

    async fn find_by_google_id(&self, google_id: &str) -> Result<Option<User>, sqlx::Error> {
        let row = sqlx::query_as::<_, UserRow>(FIND_USER_BY_GOOGLE_ID_QUERY)
            .bind(google_id)
            .fetch_optional(&self.pool)
            .await?;

        row.map(row_to_user).transpose()
    }

    async fn find_by_wallet_address(&self, address: &str) -> Result<Option<User>, sqlx::Error> {
        let row = sqlx::query_as::<_, UserRow>(FIND_USER_BY_WALLET_ADDRESS_QUERY)
            .bind(address)
            .fetch_optional(&self.pool)
            .await?;

        row.map(row_to_user).transpose()
    }

    async fn update_entity_links(
        &self,
        user_id: Uuid,
        persoana_fizica_id: Option<Uuid>,
        persoana_juridica_id: Option<Uuid>,
    ) -> Result<Option<User>, sqlx::Error> {
        let row = sqlx::query_as::<_, UserRow>(UPDATE_USER_ENTITY_LINKS_QUERY)
            .bind(user_id)
            .bind(persoana_fizica_id)
            .bind(persoana_juridica_id)
            .bind(Utc::now())
            .fetch_optional(&self.pool)
            .await?;

        row.map(row_to_user).transpose()
    }

    // -- Auth Nonces --

    async fn upsert_nonce(
        &self,
        wallet_address: &str,
        nonce: &str,
        expires_at: chrono::DateTime<Utc>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(UPSERT_NONCE_QUERY)
            .bind(wallet_address)
            .bind(nonce)
            .bind(expires_at)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn find_nonce(&self, wallet_address: &str) -> Result<Option<AuthNonce>, sqlx::Error> {
        sqlx::query_as::<_, AuthNonce>(FIND_NONCE_QUERY)
            .bind(wallet_address)
            .fetch_optional(&self.pool)
            .await
    }

    async fn delete_nonce(&self, wallet_address: &str) -> Result<(), sqlx::Error> {
        sqlx::query(DELETE_NONCE_QUERY)
            .bind(wallet_address)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // -- Refresh Tokens --

    async fn create_refresh_token(&self, token: RefreshToken) -> Result<(), sqlx::Error> {
        sqlx::query(INSERT_REFRESH_TOKEN_QUERY)
            .bind(token.id)
            .bind(token.user_id)
            .bind(&token.token_hash)
            .bind(token.expires_at)
            .bind(token.created_at)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn find_refresh_token_by_hash(
        &self,
        token_hash: &str,
    ) -> Result<Option<RefreshToken>, sqlx::Error> {
        sqlx::query_as::<_, RefreshToken>(FIND_REFRESH_TOKEN_BY_HASH_QUERY)
            .bind(token_hash)
            .fetch_optional(&self.pool)
            .await
    }

    async fn delete_refresh_token_by_hash(&self, token_hash: &str) -> Result<(), sqlx::Error> {
        sqlx::query(DELETE_REFRESH_TOKEN_BY_HASH_QUERY)
            .bind(token_hash)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn delete_all_refresh_tokens_for_user(&self, user_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query(DELETE_ALL_REFRESH_TOKENS_FOR_USER_QUERY)
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
