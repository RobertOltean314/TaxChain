use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Type;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "user_role", rename_all = "PascalCase")]
pub enum UserRole {
    Admin,
    Taxpayer,
    Auditor,
}

impl UserRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            UserRole::Admin => "Admin",
            UserRole::Taxpayer => "Taxpayer",
            UserRole::Auditor => "Auditor",
        }
    }
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "Admin" => Ok(UserRole::Admin),
            "Taxpayer" => Ok(UserRole::Taxpayer),
            "Auditor" => Ok(UserRole::Auditor),
            other => Err(format!("Unknown user_role value: '{other}'")),
        }
    }
}

impl Default for UserRole {
    fn default() -> Self {
        UserRole::Taxpayer
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,

    // Auth provider columns
    pub google_id: Option<String>,
    pub wallet_address: Option<String>,

    // Custodial wallet
    pub assigned_wallet_address: String,
    #[serde(skip_serializing)]
    pub assigned_wallet_key_enc: String,

    // Profile
    pub email: Option<String>,
    pub display_name: Option<String>,

    // Role and Status
    pub role: UserRole,
    pub is_active: bool,

    pub persoana_fizica_id: Option<Uuid>,
    pub persoana_juridica_id: Option<Uuid>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
impl User {
    pub fn from_google(
        google_id: String,
        email: Option<String>,
        display_name: Option<String>,
        assigned_wallet_address: String,
        assigned_wallet_key_enc: String,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            google_id: Some(google_id),
            wallet_address: None,
            assigned_wallet_address,
            assigned_wallet_key_enc,
            email,
            display_name,
            role: UserRole::Taxpayer,
            is_active: true,
            persoana_fizica_id: None,
            persoana_juridica_id: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn from_wallet(
        wallet_address: String,
        assigned_wallet_address: String,
        assigned_wallet_key_enc: String,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            google_id: None,
            wallet_address: Some(wallet_address),
            assigned_wallet_address,
            assigned_wallet_key_enc,
            email: None,
            display_name: None,
            role: UserRole::Taxpayer,
            is_active: true,
            persoana_fizica_id: None,
            persoana_juridica_id: None,
            created_at: now,
            updated_at: now,
        }
    }
}

#[derive(sqlx::FromRow)]
pub struct UserRow {
    pub id: Uuid,
    pub google_id: Option<String>,
    pub wallet_address: Option<String>,
    pub assigned_wallet_address: String,
    pub assigned_wallet_key_enc: String,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub role: String,
    pub is_active: bool,
    pub persoana_fizica_id: Option<Uuid>,
    pub persoana_juridica_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub fn row_to_user(row: UserRow) -> Result<User, sqlx::Error> {
    let role = UserRole::from_str(&row.role).map_err(|e| sqlx::Error::ColumnDecode {
        index: "role".to_string(),
        source: Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, e)),
    })?;

    Ok(User {
        id: row.id,
        google_id: row.google_id,
        wallet_address: row.wallet_address,
        assigned_wallet_address: row.assigned_wallet_address,
        assigned_wallet_key_enc: row.assigned_wallet_key_enc,
        email: row.email,
        display_name: row.display_name,
        role,
        is_active: row.is_active,
        persoana_fizica_id: row.persoana_fizica_id,
        persoana_juridica_id: row.persoana_juridica_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub role: UserRole,
    pub assigned_wallet_address: String,
    pub persoana_fizica_id: Option<Uuid>,
    pub persoana_juridica_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserResponse {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            email: u.email,
            display_name: u.display_name,
            role: u.role,
            assigned_wallet_address: u.assigned_wallet_address,
            persoana_fizica_id: u.persoana_fizica_id,
            persoana_juridica_id: u.persoana_juridica_id,
            created_at: u.created_at,
        }
    }
}
