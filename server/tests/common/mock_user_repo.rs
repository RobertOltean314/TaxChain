use std::sync::Arc;

use async_trait::async_trait;
use chrono::Utc;
use uuid::Uuid;

use taxchain::models::{
    auth_models::{AuthNonce, RefreshToken},
    user_model::User,
};
use taxchain::services::user_service::{DynUserRepository, UserRepository};

pub struct MockUserRepository;

#[async_trait]
impl UserRepository for MockUserRepository {
    async fn find_by_id(&self, _user_id: Uuid) -> Result<Option<User>, sqlx::Error> {
        Ok(None)
    }
    async fn find_by_google_id(&self, _google_id: &str) -> Result<Option<User>, sqlx::Error> {
        Ok(None)
    }
    async fn find_by_wallet_address(
        &self,
        _wallet_address: &str,
    ) -> Result<Option<User>, sqlx::Error> {
        Ok(None)
    }
    async fn create(&self, user: User) -> Result<User, sqlx::Error> {
        Ok(user)
    }
    async fn update_entity_links(
        &self,
        _user_id: Uuid,
        _persoana_fizica_id: Option<Uuid>,
        _persoana_juridica_id: Option<Uuid>,
    ) -> Result<Option<User>, sqlx::Error> {
        Ok(None)
    }
    async fn upsert_nonce(
        &self,
        _wallet_address: &str,
        _nonce: &str,
        _expires_at: chrono::DateTime<Utc>,
    ) -> Result<(), sqlx::Error> {
        Ok(())
    }
    async fn find_nonce(&self, _wallet_address: &str) -> Result<Option<AuthNonce>, sqlx::Error> {
        Ok(None)
    }
    async fn delete_nonce(&self, _wallet_address: &str) -> Result<(), sqlx::Error> {
        Ok(())
    }
    async fn find_refresh_token_by_hash(
        &self,
        _token_hash: &str,
    ) -> Result<Option<RefreshToken>, sqlx::Error> {
        Ok(None)
    }
    async fn create_refresh_token(&self, _token: RefreshToken) -> Result<(), sqlx::Error> {
        Ok(())
    }
    async fn delete_refresh_token_by_hash(&self, _token_hash: &str) -> Result<(), sqlx::Error> {
        Ok(())
    }
    async fn delete_all_refresh_tokens_for_user(&self, _user_id: Uuid) -> Result<(), sqlx::Error> {
        Ok(())
    }
}

pub fn mock_user_repo() -> DynUserRepository {
    Arc::new(MockUserRepository)
}
