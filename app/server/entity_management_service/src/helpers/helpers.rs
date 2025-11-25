use sha2::{Digest, Sha256};

pub fn hash_cnp(cnp: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(cnp.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}
