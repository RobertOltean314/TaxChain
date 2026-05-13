use actix_web::{HttpRequest, HttpResponse, Responder, get, post, web};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

use crate::{
    auth::{
        google::verify_google_id_token,
        jwt::{encode_token, generate_refresh_token, hash_refresh_token},
        middleware::require_role,
        wallet::{SiweError, generate_nonce, verify_siwe_signature},
    },
    models::{
        RefreshToken, UserRole,
        user_model::{User, UserResponse},
    },
    services::user_service::DynUserRepository,
    wallet::generate_custodial_wallet,
};

#[derive(Clone)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub access_token_ttl: i64,
    pub refresh_token_ttl_days: i64,
    pub google_client_id: String,
}

#[derive(Deserialize)]
pub struct GoogleCallbackRequest {
    pub id_token: String,
}

#[derive(Deserialize)]
pub struct WalletNonceQuery {
    pub address: String,
}

#[derive(Deserialize)]
pub struct WalletVerifyRequest {
    pub address: String,
    pub signature: String,
}

#[derive(Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Deserialize)]
pub struct LogoutRequest {
    pub refresh_token: String,
}

/// Body for `POST /auth/link-entity`.
/// At least one field must be Some — validated at handler level.
#[derive(Deserialize)]
pub struct LinkEntityRequest {
    pub persoana_fizica_id: Option<Uuid>,
    pub persoana_juridica_id: Option<Uuid>,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user: UserResponse,
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

async fn issue_tokens(
    user: &User,
    config: &AuthConfig,
    repo: &DynUserRepository,
) -> Result<(String, String), HttpResponse> {
    let access_token = encode_token(
        user.id,
        user.assigned_wallet_address.clone(),
        user.role,
        user.persoana_fizica_id,
        user.persoana_juridica_id,
        &config.jwt_secret,
        config.access_token_ttl,
    )
    .map_err(|e| {
        eprintln!("JWT encode error: {e}");
        HttpResponse::InternalServerError().json(json!({
            "error": "Failed to generate access token",
            "details": e.to_string()
        }))
    })?;

    let raw_refresh = generate_refresh_token();
    let token_hash = hash_refresh_token(&raw_refresh);

    let refresh_record = RefreshToken {
        id: Uuid::new_v4(),
        user_id: user.id,
        token_hash,
        expires_at: Utc::now() + Duration::days(config.refresh_token_ttl_days),
        created_at: Utc::now(),
    };

    repo.create_refresh_token(refresh_record)
        .await
        .map_err(|e| {
            eprintln!("DB error saving refresh token: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to persist session",
                "details": e.to_string()
            }))
        })?;

    Ok((access_token, raw_refresh))
}

// ============================================================================
// HANDLERS
// ============================================================================

#[post("/google")]
pub async fn google_login_handler(
    body: web::Json<GoogleCallbackRequest>,
    repo: web::Data<DynUserRepository>,
    config: web::Data<AuthConfig>,
    http_client: web::Data<reqwest::Client>,
) -> impl Responder {
    let token_info = match verify_google_id_token(
        &body.id_token,
        &config.google_client_id,
        &http_client,
    )
    .await
    {
        Ok(info) => info,
        Err(e) => {
            return HttpResponse::Unauthorized().json(json!({
                "error": "Google authentication failed",
                "details": e.to_string()
            }));
        }
    };

    let user = match repo.find_by_google_id(&token_info.sub).await {
        Ok(Some(existing)) => existing,
        Ok(None) => {
            let (wallet_address, wallet_key_enc) = match generate_custodial_wallet() {
                Ok(pair) => pair,
                Err(e) => {
                    eprintln!("Wallet generation error: {e}");
                    return HttpResponse::InternalServerError().json(json!({
                        "error": "Failed to generate wallet",
                        "details": e.to_string()
                    }));
                }
            };

            let new_user = User::from_google(
                token_info.sub.clone(),
                token_info.email.clone(),
                token_info.name.clone(),
                wallet_address,
                wallet_key_enc,
            );

            match repo.create(new_user).await {
                Ok(u) => u,
                Err(e) => {
                    eprintln!("DB error creating user: {e}");
                    return HttpResponse::InternalServerError().json(json!({
                        "error": "Failed to create user account",
                        "details": e.to_string()
                    }));
                }
            }
        }
        Err(e) => {
            eprintln!("DB error finding user: {e}");
            return HttpResponse::InternalServerError().json(json!({
                "error": "Database error",
                "details": e.to_string()
            }));
        }
    };

    if !user.is_active {
        return HttpResponse::Forbidden().json(json!({ "error": "Account is disabled" }));
    }

    let (access_token, refresh_token) = match issue_tokens(&user, &config, &repo).await {
        Ok(pair) => pair,
        Err(resp) => return resp,
    };

    HttpResponse::Ok().json(AuthResponse {
        access_token,
        refresh_token,
        user: UserResponse::from(user),
    })
}

#[get("/wallet/nonce")]
pub async fn wallet_nonce_handler(
    query: web::Query<WalletNonceQuery>,
    repo: web::Data<DynUserRepository>,
) -> impl Responder {
    let nonce = generate_nonce(&query.address);

    match repo
        .upsert_nonce(&nonce.wallet_address, &nonce.nonce, nonce.expires_at)
        .await
    {
        Ok(_) => HttpResponse::Ok().json(json!({ "nonce": nonce.nonce })),
        Err(e) => {
            eprintln!("DB error upserting nonce: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to issue nonce",
                "details": e.to_string()
            }))
        }
    }
}

#[post("/wallet/verify")]
pub async fn wallet_verify_handler(
    body: web::Json<WalletVerifyRequest>,
    repo: web::Data<DynUserRepository>,
    config: web::Data<AuthConfig>,
) -> impl Responder {
    let stored_nonce = match repo.find_nonce(&body.address).await {
        Ok(Some(n)) => n,
        Ok(None) => {
            return HttpResponse::Unauthorized().json(json!({
                "error": "No nonce found for this address — request a new one"
            }));
        }
        Err(e) => {
            eprintln!("DB error fetching nonce: {e}");
            return HttpResponse::InternalServerError().json(json!({
                "error": "Database error",
                "details": e.to_string()
            }));
        }
    };

    if let Err(e) = verify_siwe_signature(&body.address, &body.signature, &stored_nonce) {
        let mut status = match e {
            SiweError::NonceExpired | SiweError::NonceNotFound(_) => HttpResponse::Unauthorized(),
            SiweError::InvalidSignature(_) | SiweError::AddressMismatch { .. } => {
                HttpResponse::Unauthorized()
            }
        };
        return status.json(json!({
            "error": "Signature verification failed",
            "details": e.to_string()
        }));
    }

    if let Err(e) = repo.delete_nonce(&body.address).await {
        eprintln!("Warning: failed to delete used nonce: {e}");
    }

    let user = match repo.find_by_wallet_address(&body.address).await {
        Ok(Some(existing)) => existing,
        Ok(None) => {
            let new_user = User::from_wallet(body.address.clone());
            match repo.create(new_user).await {
                Ok(u) => u,
                Err(e) => {
                    eprintln!("DB error creating user: {e}");
                    return HttpResponse::InternalServerError().json(json!({
                        "error": "Failed to create user account",
                        "details": e.to_string()
                    }));
                }
            }
        }
        Err(e) => {
            eprintln!("DB error finding user: {e}");
            return HttpResponse::InternalServerError().json(json!({
                "error": "Database error",
                "details": e.to_string()
            }));
        }
    };

    if !user.is_active {
        return HttpResponse::Forbidden().json(json!({ "error": "Account is disabled" }));
    }

    let (access_token, refresh_token) = match issue_tokens(&user, &config, &repo).await {
        Ok(pair) => pair,
        Err(resp) => return resp,
    };

    HttpResponse::Ok().json(AuthResponse {
        access_token,
        refresh_token,
        user: UserResponse::from(user),
    })
}

#[post("/refresh")]
pub async fn refresh_token_handler(
    body: web::Json<RefreshRequest>,
    repo: web::Data<DynUserRepository>,
    config: web::Data<AuthConfig>,
) -> impl Responder {
    let token_hash = hash_refresh_token(&body.refresh_token);

    let record = match repo.find_refresh_token_by_hash(&token_hash).await {
        Ok(Some(r)) => r,
        Ok(None) => {
            return HttpResponse::Unauthorized()
                .json(json!({ "error": "Invalid or already-used refresh token" }));
        }
        Err(e) => {
            eprintln!("DB error finding refresh token: {e}");
            return HttpResponse::InternalServerError().json(json!({
                "error": "Database error",
                "details": e.to_string()
            }));
        }
    };

    if Utc::now() > record.expires_at {
        let _ = repo.delete_refresh_token_by_hash(&token_hash).await;
        return HttpResponse::Unauthorized().json(json!({ "error": "Refresh token has expired" }));
    }

    let user = match repo.find_by_id(record.user_id).await {
        Ok(Some(u)) => u,
        Ok(None) => {
            return HttpResponse::Unauthorized().json(json!({ "error": "User not found" }));
        }
        Err(e) => {
            eprintln!("DB error finding user: {e}");
            return HttpResponse::InternalServerError().json(json!({
                "error": "Database error",
                "details": e.to_string()
            }));
        }
    };

    if !user.is_active {
        return HttpResponse::Forbidden().json(json!({ "error": "Account is disabled" }));
    }

    if let Err(e) = repo.delete_refresh_token_by_hash(&token_hash).await {
        eprintln!("Warning: failed to delete old refresh token: {e}");
    }

    let (access_token, new_refresh_token) = match issue_tokens(&user, &config, &repo).await {
        Ok(pair) => pair,
        Err(resp) => return resp,
    };

    HttpResponse::Ok().json(AuthResponse {
        access_token,
        refresh_token: new_refresh_token,
        user: UserResponse::from(user),
    })
}

#[post("/logout")]
pub async fn logout(
    body: web::Json<LogoutRequest>,
    repo: web::Data<DynUserRepository>,
) -> impl Responder {
    let token_hash = hash_refresh_token(&body.refresh_token);

    match repo.delete_refresh_token_by_hash(&token_hash).await {
        Ok(_) => HttpResponse::Ok().json(json!({ "message": "Logged out successfully" })),
        Err(e) => {
            eprintln!("DB error deleting refresh token: {e}");
            HttpResponse::InternalServerError().json(json!({
                "error": "Logout failed",
                "details": e.to_string()
            }))
        }
    }
}

/// `POST /auth/link-entity`
///
/// Links the authenticated user to a `PersoanaFizica` or `PersoanaJuridica`
/// record (or both). Re-issues a fresh token pair so the new entity IDs are
/// immediately reflected in the JWT claims without requiring a full re-login.
///
/// Rules:
/// - At least one of `persoana_fizica_id` / `persoana_juridica_id` must be provided.
/// - A user can only link to themselves — enforced by using the user_id from the JWT.
/// - Passing `null` for a field clears the existing link.
#[post("/link-entity")]
pub async fn link_entity_handler(
    req: HttpRequest,
    body: web::Json<LinkEntityRequest>,
    repo: web::Data<DynUserRepository>,
    config: web::Data<AuthConfig>,
) -> impl Responder {
    // Require any authenticated role — all users can link their own entity
    let auth_user = match require_role(
        &req,
        &[UserRole::Admin, UserRole::Taxpayer, UserRole::Auditor],
    ) {
        Ok(u) => u,
        Err(resp) => return resp,
    };

    if body.persoana_fizica_id.is_none() && body.persoana_juridica_id.is_none() {
        return HttpResponse::UnprocessableEntity().json(json!({
            "error": "At least one of persoana_fizica_id or persoana_juridica_id must be provided"
        }));
    }

    let user_id = match auth_user.claims().user_id() {
        Ok(id) => id,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(json!({ "error": "Invalid user ID in token" }));
        }
    };

    // Persist the links
    let updated_user = match repo
        .update_entity_links(user_id, body.persoana_fizica_id, body.persoana_juridica_id)
        .await
    {
        Ok(Some(u)) => u,
        Ok(None) => {
            return HttpResponse::NotFound().json(json!({ "error": "User not found" }));
        }
        Err(e) => {
            eprintln!("link_entity error: {e}");
            return HttpResponse::InternalServerError().json(json!({
                "error": "Failed to link entity",
                "details": e.to_string()
            }));
        }
    };

    // Delete old refresh tokens so the client must use the new pair
    if let Err(e) = repo.delete_all_refresh_tokens_for_user(user_id).await {
        eprintln!("Warning: failed to clear old refresh tokens after entity link: {e}");
    }

    // Re-issue tokens — new claims now carry the entity IDs
    let (access_token, refresh_token) = match issue_tokens(&updated_user, &config, &repo).await {
        Ok(pair) => pair,
        Err(resp) => return resp,
    };

    HttpResponse::Ok().json(AuthResponse {
        access_token,
        refresh_token,
        user: UserResponse::from(updated_user),
    })
}
