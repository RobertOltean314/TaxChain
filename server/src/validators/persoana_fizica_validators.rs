use lazy_static::lazy_static;
use regex::Regex;
use validator::ValidationError;

lazy_static! {
    static ref CNP_REGEX: Regex = Regex::new(r"^\d{13}$").unwrap();
    static ref COD_POSTAL_REGEX: Regex = Regex::new(r"^\d{6}$").unwrap();
    static ref IBAN_REGEX: Regex = Regex::new(r"^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$").unwrap();
    static ref TELEFON_REGEX: Regex = Regex::new(r"^\+?[1-9]\d{7,14}$").unwrap();
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

/// Validates Romanian postal code (6 digits).
pub fn validate_cod_postal(cod: &str) -> Result<(), ValidationError> {
    if !COD_POSTAL_REGEX.is_match(cod) {
        return Err(ValidationError::new("cod_postal_invalid"));
    }
    Ok(())
}

/// Validates IBAN format with basic structure check.
/// Full mod-97 validation included.
pub fn validate_iban(iban: &str) -> Result<(), ValidationError> {
    if !IBAN_REGEX.is_match(iban) {
        return Err(ValidationError::new("iban_invalid_format"));
    }

    // IBAN mod-97 checksum validation
    let rearranged = format!("{}{}", &iban[4..], &iban[..4]);

    let numeric_string: String = rearranged
        .chars()
        .map(|c| {
            if c.is_ascii_uppercase() {
                format!("{}", c as u32 - 'A' as u32 + 10)
            } else {
                c.to_string()
            }
        })
        .collect();

    // Calculate mod 97 in chunks to avoid overflow
    let remainder = numeric_string.chars().fold(0u64, |acc, c| {
        let digit = c.to_digit(10).unwrap() as u64;
        (acc * 10 + digit) % 97
    });

    if remainder != 1 {
        return Err(ValidationError::new("iban_invalid_checksum"));
    }

    Ok(())
}

/// Validates phone number in E.164-like format.
pub fn validate_telefon(telefon: &str) -> Result<(), ValidationError> {
    if !TELEFON_REGEX.is_match(telefon) {
        return Err(ValidationError::new("telefon_invalid"));
    }
    Ok(())
}
