use reqwest::Client;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct GoogleTokenInfo {
    pub sub: String,
    pub email: Option<String>,
    pub name: Option<String>,
    pub aud: String,
    pub exp: String,
}

#[derive(Debug, thiserror::Error)]
pub enum GoogleAuthError {
    #[error("HTTP request to Google failed: {0}")]
    RequestFailed(#[from] reqwest::Error),

    #[error("Token is invalid or expired (Google rejected it)")]
    InvalidToken,

    #[error("Token audience '{0}' does not match expected client ID")]
    AudienceMismatch(String),

    #[error("Token has expired")]
    TokenExpired,
}

pub async fn verify_google_id_token(
    id_token: &str,
    expected_aud: &str,
    http_client: &Client,
) -> Result<GoogleTokenInfo, GoogleAuthError> {
    let url = format!("https://oauth2.googleapis.com/tokeninfo?id_token={id_token}");

    let response = http_client.get(&url).send().await?;

    // Google returns 400 for invalid/expired tokens
    if !response.status().is_success() {
        return Err(GoogleAuthError::InvalidToken);
    }

    let token_info: GoogleTokenInfo = response
        .json()
        .await
        .map_err(|_| GoogleAuthError::InvalidToken)?;

    // Verify the token was issued for our app, not someone else's client ID
    if token_info.aud != expected_aud {
        return Err(GoogleAuthError::AudienceMismatch(token_info.aud.clone()));
    }

    // Verify the token hasn't expired (belt-and-suspenders — Google also checks this)
    let exp: i64 = token_info
        .exp
        .parse()
        .map_err(|_| GoogleAuthError::InvalidToken)?;

    if exp < chrono::Utc::now().timestamp() {
        return Err(GoogleAuthError::TokenExpired);
    }

    Ok(token_info)
}
