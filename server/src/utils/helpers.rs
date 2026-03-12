pub fn require_env(key: &str) -> std::io::Result<String> {
    std::env::var(key).map_err(|_| io_error(&format!("Environment variable '{key}' must be set")))
}

pub fn io_error(msg: &str) -> std::io::Error {
    std::io::Error::new(std::io::ErrorKind::Other, msg)
}
