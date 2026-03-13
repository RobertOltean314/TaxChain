use actix_web::{HttpResponse, Responder, get, post, web};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

use crate::{
    auth::{
        google::verify_google_id_token,
        jwt::{encode_token, generate_refresh_token, hash_refresh_token},
        wallet::{SiweError, generate_nonce, verify_siwe_signature},
    },
    models::{
        RefreshToken,
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

#[derive(Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user: UserResponse,
}

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

#[post("/google")]
pub async fn google_login_handler(
    body: web::Json<GoogleCallbackRequest>,
    repo: web::Data<DynUserRepository>,
    config: web::Data<AuthConfig>,
    http_client: web::Data<reqwest::Client>,
) -> impl Responder {
    // 1. Verify the ID token with Google
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

    // 2. Look up or create user
    let user = match repo.find_by_google_id(&token_info.sub).await {
        Ok(Some(existing)) => existing,
        Ok(None) => {
            // New user — generate a custodial wallet
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

    // 3. Check account is active
    if !user.is_active {
        return HttpResponse::Forbidden().json(json!({ "error": "Account is disabled" }));
    }

    // 4. Issue tokens
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
    // 1. Fetch the stored nonce
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

    // 2. Verify the signature
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

    // 3. Delete the nonce — single use
    if let Err(e) = repo.delete_nonce(&body.address).await {
        eprintln!("Warning: failed to delete used nonce: {e}");
        // Non-fatal — continue, but log it
    }

    // 4. Look up or create user
    let user = match repo.find_by_wallet_address(&body.address).await {
        Ok(Some(existing)) => existing,
        Ok(None) => {
            // The login wallet IS the assigned wallet — the user owns their private key,
            // so no custodial wallet is generated. Custodial wallets are only created
            // for Google users who don't have a wallet of their own.
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

    // 5. Issue tokens
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

    // 1. Find the stored record
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

    // 2. Check expiry
    if Utc::now() > record.expires_at {
        // Clean up expired record
        let _ = repo.delete_refresh_token_by_hash(&token_hash).await;
        return HttpResponse::Unauthorized().json(json!({ "error": "Refresh token has expired" }));
    }

    // 3. Load the user
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

    // 4. Delete the old refresh token (rotation — one-time use)
    if let Err(e) = repo.delete_refresh_token_by_hash(&token_hash).await {
        eprintln!("Warning: failed to delete old refresh token: {e}");
    }

    // 5. Issue new token pair
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
