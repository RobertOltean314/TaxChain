/**
 * Validation Feature Models
 * Maps to validation-service
 */

import { CreateInvoiceRequest } from '../../invoice/models/invoice.models';
import { BusinessEntityValidationRequest } from '../../business-entity/models/business-entity.models';
import { TaxCalculationRequest } from '../../tax-calculation/models/tax-calculation.models';

/**
 * Validation Response
 * Maps to ValidationResponse in validation-service handlers.rs
 */
export interface ValidationResponse {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  validation_type: string;
}

/**
 * Comprehensive Validation Request
 * Maps to ComprehensiveValidationRequest in validation-service handlers.rs
 */
export interface ComprehensiveValidationRequest {
  invoice?: CreateInvoiceRequest;
  business_entity?: BusinessEntityValidationRequest;
  tax_calculation?: TaxCalculationRequest;
}

/**
 * Comprehensive Validation Response
 * Maps to ComprehensiveValidationResponse in validation-service handlers.rs
 */
export interface ComprehensiveValidationResponse {
  overall_valid: boolean;
  invoice_validation?: ValidationResponse;
  business_entity_validation?: ValidationResponse;
  tax_calculation_validation?: ValidationResponse;
  cross_validation_errors: string[];
}
