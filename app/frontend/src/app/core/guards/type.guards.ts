/**
 * Type Guards for Runtime Type Checking
 * Validates that API responses match expected TypeScript interfaces
 */

import {
  InvoiceResponse,
  LineItemDto,
  BusinessEntityDto,
} from '../../features/invoice/models/invoice.models';
import { BusinessEntity } from '../../features/business-entity/models/business-entity.models';
import { TaxCalculationResponse } from '../../features/tax-calculation/models/tax-calculation.models';
import { ZkProofResponse } from '../../features/zk-proof/models/zk-proof.models';
import { ApiResponse, ErrorResponse } from '../models/common.models';

/**
 * Type guard for ApiResponse<T>
 */
export function isApiResponse<T>(obj: any): obj is ApiResponse<T> {
  return (
    obj &&
    typeof obj === 'object' &&
    'success' in obj &&
    typeof obj.success === 'boolean' &&
    'timestamp' in obj &&
    typeof obj.timestamp === 'string'
  );
}

/**
 * Type guard for ErrorResponse
 */
export function isErrorResponse(obj: any): obj is ErrorResponse {
  return (
    obj &&
    typeof obj === 'object' &&
    'error' in obj &&
    typeof obj.error === 'string' &&
    'timestamp' in obj &&
    typeof obj.timestamp === 'string'
  );
}

/**
 * Type guard for InvoiceResponse
 */
export function isInvoiceResponse(obj: any): obj is InvoiceResponse {
  return (
    obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    typeof obj.id === 'string' &&
    'numar_serie' in obj &&
    typeof obj.numar_serie === 'string' &&
    'baza_impozabila' in obj &&
    typeof obj.baza_impozabila === 'number' &&
    'total_tva' in obj &&
    typeof obj.total_tva === 'number' &&
    'total_de_plata' in obj &&
    typeof obj.total_de_plata === 'number'
  );
}

/**
 * Type guard for BusinessEntity
 */
export function isBusinessEntity(obj: any): obj is BusinessEntity {
  return (
    obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    typeof obj.id === 'string' &&
    'name' in obj &&
    typeof obj.name === 'string' &&
    'registration_number' in obj &&
    typeof obj.registration_number === 'string' &&
    'tax_id' in obj &&
    typeof obj.tax_id === 'string'
  );
}

/**
 * Type guard for TaxCalculationResponse
 */
export function isTaxCalculationResponse(
  obj: any
): obj is TaxCalculationResponse {
  return (
    obj &&
    typeof obj === 'object' &&
    'total_income' in obj &&
    typeof obj.total_income === 'number' &&
    'total_expenses' in obj &&
    typeof obj.total_expenses === 'number' &&
    'profit' in obj &&
    typeof obj.profit === 'number' &&
    'tax_owed' in obj &&
    typeof obj.tax_owed === 'number' &&
    'calculation_id' in obj &&
    typeof obj.calculation_id === 'string'
  );
}

/**
 * Type guard for ZkProofResponse
 */
export function isZkProofResponse(obj: any): obj is ZkProofResponse {
  return (
    obj &&
    typeof obj === 'object' &&
    'proof_generated' in obj &&
    typeof obj.proof_generated === 'boolean' &&
    'calculation_id' in obj &&
    typeof obj.calculation_id === 'string' &&
    'timestamp' in obj &&
    typeof obj.timestamp === 'string'
  );
}

/**
 * Type guard for array of items
 */
export function isArrayOf<T>(
  obj: any,
  itemGuard: (item: any) => item is T
): obj is T[] {
  return Array.isArray(obj) && obj.every(itemGuard);
}

/**
 * Validation helper - throws error if type guard fails
 */
export function assertType<T>(
  obj: any,
  guard: (obj: any) => obj is T,
  errorMessage: string
): asserts obj is T {
  if (!guard(obj)) {
    throw new TypeError(errorMessage);
  }
}
