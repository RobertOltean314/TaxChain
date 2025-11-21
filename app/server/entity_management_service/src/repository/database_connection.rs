use sqlx::{PgPool, postgres::PgPoolOptions};
use std::time::Duration;

pub async fn create_pool() -> PgPool {
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".into());
        let project_root = std::path::Path::new(&manifest_dir)
            .parent()
            .unwrap_or(std::path::Path::new("."));
        let env_path = project_root.join(".env");

        dotenvy::from_path(&env_path).ok();
        std::env::var("DATABASE_URL").expect("DATABASE_URL lipsește din .env")
    });

    PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(30))
        .connect(&database_url)
        .await
        .expect("Nu pot conecta la PostgreSQL – verifică dacă rulează pe localhost:5432")
}
