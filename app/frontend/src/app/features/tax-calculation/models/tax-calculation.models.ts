/**
 * Tax Calculation Feature Models
 * Maps to tax-calculation-service and common-types
 */

import { CountryCode } from '../../../core/models/common.models';
import { InvoiceData } from '../../invoice/models/invoice.models';

/**
 * Tax Calculation Request
 * Maps to TaxCalculationRequest in Rust common-types
 */
export interface TaxCalculationRequest {
  invoice_data: InvoiceData;
  tax_year?: number;
  country_code?: CountryCode;
  business_entity_id?: string;
}

/**
 * Tax Breakdown
 * Maps to TaxBreakdown in Rust common-types
 */
export interface TaxBreakdown {
  income_tax: number;
  social_security_tax: number;
  health_insurance_tax: number;
  other_taxes: number;
}

/**
 * Tax Calculation Response
 * Maps to TaxCalculationResponse in Rust common-types
 */
export interface TaxCalculationResponse {
  total_income: number;
  total_expenses: number;
  profit: number;
  tax_owed: number;
  tax_rate: number;
  zk_proof_generated: boolean;
  calculation_id: string;
  timestamp: string;
  breakdown: TaxBreakdown;
}

/**
 * Tax Rate Request
 * Maps to TaxRateRequest in Rust common-types
 */
export interface TaxRateRequest {
  country_code: CountryCode;
  entity_type?: string;
  income_bracket?: number;
}
