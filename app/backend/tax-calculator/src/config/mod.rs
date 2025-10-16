use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub server_host: String,
    pub server_port: u16,
    pub tax_rate: f64,
    pub enable_zk_proofs: bool,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            server_host: env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "8081".to_string())
                .parse()?,
            tax_rate: env::var("TAX_RATE")
                .unwrap_or_else(|_| "0.10".to_string())
                .parse()?,
            enable_zk_proofs: env::var("ENABLE_ZK_PROOFS")
                .unwrap_or_else(|_| "true".to_string())
                .parse()
                .unwrap_or(true),
        })
    }

    pub fn bind_address(&self) -> String {
        format!("{}:{}", self.server_host, self.server_port)
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            server_host: "0.0.0.0".to_string(),
            server_port: 8081,
            tax_rate: 0.10, // 10% for Romania
            enable_zk_proofs: true,
        }
    }
}
