use lazy_static::lazy_static;
use regex::Regex;
use validator::ValidationError;

lazy_static! {
    static ref CNP_REGEX: Regex = Regex::new(r"^\d{13}$").unwrap();
}

/// Validates Romanian CNP (Cod Numeric Personal) with checksum verification.
/// CNP format: SAALLZZJJNNNC
/// - S: sex digit (1-8)
/// - AA: year of birth
/// - LL: month of birth
/// - ZZ: day of birth
/// - JJ: county code
/// - NNN: order number
/// - C: control digit
pub fn validate_cnp(cnp: &str) -> Result<(), ValidationError> {
    if !CNP_REGEX.is_match(cnp) {
        return Err(ValidationError::new("cnp_invalid_format"));
    }

    // CNP checksum validation
    const CONTROL_KEY: [u32; 12] = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];

    let digits: Vec<u32> = cnp.chars().filter_map(|c| c.to_digit(10)).collect();

    // Check sex digit (1-8 are valid)
    if digits[0] < 1 || digits[0] > 8 {
        return Err(ValidationError::new("cnp_invalid_sex_digit"));
    }

    // Checksum calculation
    let sum: u32 = digits
        .iter()
        .take(12)
        .zip(CONTROL_KEY.iter())
        .map(|(d, k)| d * k)
        .sum();

    let remainder = sum % 11;
    let expected_control = if remainder == 10 { 1 } else { remainder };

    if digits[12] != expected_control {
        return Err(ValidationError::new("cnp_invalid_checksum"));
    }

    Ok(())
}
