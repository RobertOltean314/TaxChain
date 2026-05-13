use taxchain::{
    auth::middleware::AuthenticatedUser,
    models::{Claims, UserRole},
};
use uuid::Uuid;

pub const TEST_USER_ID: Uuid = uuid::uuid!("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
pub const TEST_PF_ID: Uuid = uuid::uuid!("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

/// Build a fake AuthenticatedUser for injection into test requests.
pub fn admin_user() -> AuthenticatedUser {
    AuthenticatedUser(Claims {
        sub: TEST_USER_ID.to_string(),
        persoana_fizica_id: Some(TEST_PF_ID),
        persoana_juridica_id: None,
        wallet: "0xTestWallet".to_string(),
        role: UserRole::Admin,
        iat: 0,
        exp: i64::MAX,
    })
}

pub fn taxpayer_user() -> AuthenticatedUser {
    AuthenticatedUser(Claims {
        sub: TEST_USER_ID.to_string(),
        persoana_fizica_id: Some(TEST_PF_ID),
        persoana_juridica_id: None,
        wallet: "0xTestWallet".to_string(),
        role: UserRole::Taxpayer,
        iat: 0,
        exp: i64::MAX,
    })
}

pub fn auditor_user() -> AuthenticatedUser {
    AuthenticatedUser(Claims {
        sub: TEST_USER_ID.to_string(),
        persoana_fizica_id: None,
        persoana_juridica_id: None,
        wallet: "0xTestWallet".to_string(),
        role: UserRole::Auditor,
        iat: 0,
        exp: i64::MAX,
    })
}
