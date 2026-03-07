use chrono::Datelike;
use lazy_static::lazy_static;
use regex::Regex;
use validator::ValidationError;

lazy_static! {
    static ref COD_FISCAL_REGEX: Regex = Regex::new(r"^(RO)?\d{2,10}$").unwrap();
    static ref NR_REG_COM_REGEX: Regex = Regex::new(r"^[JF]\d{2}/\d+/\d{4}$").unwrap();
    static ref CAEN_REGEX: Regex = Regex::new(r"^\d{4}$").unwrap();
}

/// Validates Romanian CUI/CIF (Cod Unic de Identificare / Cod de Identificare Fiscală).
/// Format: 2-10 digits, optionally prefixed with "RO" for VAT registered companies.
/// Includes checksum validation for the numeric part.
pub fn validate_cod_fiscal(cod: &str) -> Result<(), ValidationError> {
    if !COD_FISCAL_REGEX.is_match(cod) {
        return Err(ValidationError::new("cod_fiscal_invalid_format"));
    }

    // Extract numeric part (remove RO prefix if present)
    let numeric_part = cod.strip_prefix("RO").unwrap_or(cod);

    // CUI checksum validation
    // Control key: 753217532
    const CONTROL_KEY: [u32; 9] = [7, 5, 3, 2, 1, 7, 5, 3, 2];

    let digits: Vec<u32> = numeric_part
        .chars()
        .filter_map(|c| c.to_digit(10))
        .collect();

    if digits.len() < 2 || digits.len() > 10 {
        return Err(ValidationError::new("cod_fiscal_invalid_length"));
    }

    // Pad with leading zeros to 9 digits (excluding control digit)
    let control_digit = digits[digits.len() - 1];
    let main_digits: Vec<u32> = if digits.len() < 10 {
        let padding = 9 - (digits.len() - 1);
        let mut padded = vec![0u32; padding];
        padded.extend(&digits[..digits.len() - 1]);
        padded
    } else {
        digits[..9].to_vec()
    };

    // Calculate checksum
    let sum: u32 = main_digits
        .iter()
        .zip(CONTROL_KEY.iter())
        .map(|(d, k)| d * k)
        .sum();

    let remainder = (sum * 10) % 11;
    let expected_control = if remainder == 10 { 0 } else { remainder };

    if control_digit != expected_control {
        return Err(ValidationError::new("cod_fiscal_invalid_checksum"));
    }

    Ok(())
}

/// Validates Romanian Trade Registry Number (Număr de Înregistrare în Registrul Comerțului).
/// Format: J/F + county code (2 digits) + / + order number + / + year (4 digits)
/// Example: J40/1234/2020
pub fn validate_nr_reg_com(nr: &str) -> Result<(), ValidationError> {
    if !NR_REG_COM_REGEX.is_match(nr) {
        return Err(ValidationError::new("nr_reg_com_invalid_format"));
    }

    // Extract parts for additional validation
    let parts: Vec<&str> = nr.split('/').collect();
    if parts.len() != 3 {
        return Err(ValidationError::new("nr_reg_com_invalid_structure"));
    }

    // Validate county code (01-52 for counties, some special codes)
    let county_code: u32 = parts[0][1..].parse().unwrap_or(0);
    if county_code < 1 || county_code > 52 {
        return Err(ValidationError::new("nr_reg_com_invalid_county"));
    }

    // Validate year (reasonable range: 1990 - current)
    let year: u32 = parts[2].parse().unwrap_or(0);
    if year < 1990 || year > 2100 {
        return Err(ValidationError::new("nr_reg_com_invalid_year"));
    }

    Ok(())
}

/// Validates CAEN code (Romanian NACE classification).
/// Format: 4 digits.
pub fn validate_caen(caen: &str) -> Result<(), ValidationError> {
    if !CAEN_REGEX.is_match(caen) {
        return Err(ValidationError::new("caen_invalid_format"));
    }
    Ok(())
}

/// Validates founding year (an_infiintare).
/// Must be between 1800 and current year.
pub fn validate_an_infiintare(year: i32) -> Result<(), ValidationError> {
    let current_year = chrono::Utc::now().year();
    if year < 1800 || year > current_year {
        return Err(ValidationError::new("an_infiintare_invalid"));
    }
    Ok(())
}

/// Validates capital social (share capital).
/// Must be positive and at least 1 RON for SRL.
pub fn validate_capital_social(capital: f64) -> Result<(), ValidationError> {
    if capital < 1.0 {
        return Err(ValidationError::new("capital_social_too_low"));
    }
    Ok(())
}

/// Validates number of employees.
/// Must be non-negative.
pub fn validate_numar_angajati(numar: i32) -> Result<(), ValidationError> {
    if numar < 0 {
        return Err(ValidationError::new("numar_angajati_negative"));
    }
    Ok(())
}
