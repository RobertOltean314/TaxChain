use chrono::NaiveDate;
use rust_decimal::Decimal;
use uuid::Uuid;

/// Generate a minimal UBL 2.1 XML invoice for ANAF submission
pub fn generate_ubl_xml(
    _invoice_id: Uuid,
    invoice_number: &str,
    issue_date: NaiveDate,
    issuer_cif: &str,
    issuer_name: &str,
    customer_cif: &str,
    customer_name: &str,
    subtotal: Decimal,
    _vat_total: Decimal,
    total: Decimal,
) -> String {
    let issue_date_str = issue_date.format("%Y-%m-%d").to_string();

    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
    <cbc:ID>{}</cbc:ID>
    <cbc:IssueDate>{}</cbc:IssueDate>
    <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>

    <!-- Supplier (Issuer) -->
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cbc:EndpointID schemeID="9944">{}</cbc:EndpointID>
            <cac:PartyName>
                <cbc:Name>{}</cbc:Name>
            </cac:PartyName>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <!-- Customer -->
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cbc:EndpointID schemeID="9944">{}</cbc:EndpointID>
            <cac:PartyName>
                <cbc:Name>{}</cbc:Name>
            </cac:PartyName>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <!-- Invoice totals -->
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="RON">{:.2}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="RON">{:.2}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="RON">{:.2}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="RON">{:.2}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
</Invoice>"#,
        invoice_number,
        issue_date_str,
        issuer_cif,
        issuer_name,
        customer_cif,
        customer_name,
        subtotal,
        subtotal,
        total,
        total
    )
}

/// Validate basic UBL XML structure (minimal check)
pub fn validate_ubl_xml(xml: &str) -> Result<(), String> {
    if !xml.contains("<?xml") {
        return Err("Invalid XML: Missing XML declaration".to_string());
    }

    if !xml.contains("<Invoice") {
        return Err("Invalid UBL: Missing Invoice root element".to_string());
    }

    if !xml.contains("<cbc:ID>") {
        return Err("Invalid UBL: Missing invoice ID".to_string());
    }

    if !xml.contains("<cbc:IssueDate>") {
        return Err("Invalid UBL: Missing issue date".to_string());
    }

    if !xml.contains("AccountingSupplierParty") {
        return Err("Invalid UBL: Missing supplier information".to_string());
    }

    if !xml.contains("AccountingCustomerParty") {
        return Err("Invalid UBL: Missing customer information".to_string());
    }

    Ok(())
}
