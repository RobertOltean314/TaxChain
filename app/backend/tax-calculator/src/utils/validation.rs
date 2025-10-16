pub struct CuiValidator;

impl CuiValidator {
    pub fn is_valid_cui(cui: &str) -> bool {
        let clean_cui = cui.strip_prefix("RO").unwrap_or(cui);

        // Basic format validation
        if clean_cui.len() < 2 || clean_cui.len() > 10 {
            return false;
        }

        if !clean_cui.chars().all(|c| c.is_ascii_digit()) {
            return false;
        }

        // TODO: Implement full checksum validation algorithm for Romanian CUI
        // This would involve the Luhn algorithm or similar
        Self::validate_cui_checksum(clean_cui)
    }

    /// Validates CUI checksum (simplified version)
    /// In a real implementation, this would use the official Romanian algorithm
    fn validate_cui_checksum(cui: &str) -> bool {
        cui.len() >= 2 && cui.len() <= 10
    }

    pub fn format_cui(cui: &str) -> String {
        if cui.starts_with("RO") {
            cui.to_string()
        } else {
            format!("RO{}", cui)
        }
    }
}

/// General validation utilities
pub struct ValidationUtils;

impl ValidationUtils {
    pub fn is_positive_amount(amount: f64) -> bool {
        amount > 0.0 && amount.is_finite()
    }

    pub fn is_valid_email(email: &str) -> bool {
        email.contains('@') && email.contains('.') && email.len() > 5
    }

    pub fn is_valid_romanian_postal_code(code: &str) -> bool {
        code.len() == 6 && code.chars().all(|c| c.is_ascii_digit())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cui_validation() {
        assert!(CuiValidator::is_valid_cui("12345678"));
        assert!(CuiValidator::is_valid_cui("RO12345678"));
        assert!(!CuiValidator::is_valid_cui("1")); // too short
        assert!(!CuiValidator::is_valid_cui("12345678901")); // too long
        assert!(!CuiValidator::is_valid_cui("1234567a")); // contains letter
    }

    #[test]
    fn test_amount_validation() {
        assert!(ValidationUtils::is_positive_amount(100.0));
        assert!(!ValidationUtils::is_positive_amount(-100.0));
        assert!(!ValidationUtils::is_positive_amount(0.0));
        assert!(!ValidationUtils::is_positive_amount(f64::NAN));
    }
}
