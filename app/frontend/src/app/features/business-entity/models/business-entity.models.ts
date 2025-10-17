/**
 * Business Entity Feature Models
 * Maps to business-entity-service and common-types
 */

import { CountryCode } from '../../../core/models/common.models';

/**
 * Business Entity Type enum
 * Maps to BusinessEntityType in Rust
 */
export enum BusinessEntityType {
  Individual = 'Individual',
  SRL = 'SRL', // Romanian LLC
  SA = 'SA', // Romanian SA
  PFA = 'PFA', // Romanian Individual Entrepreneur
  II = 'II', // Romanian Individual Enterprise
  Other = 'Other',
}

/**
 * Business Entity
 * Maps to BusinessEntity in Rust common-types
 */
export interface BusinessEntity {
  id: string;
  name: string;
  registration_number: string;
  tax_id: string;
  country_code: CountryCode;
  address: string;
  entity_type: BusinessEntityType | { Other: string };
  is_active: boolean;
}

/**
 * Create Business Entity Request
 * Maps to CreateBusinessEntityRequest in Rust common-types
 */
export interface CreateBusinessEntityRequest {
  name: string;
  registration_number: string;
  tax_id: string;
  country_code: CountryCode;
  address: string;
  entity_type: BusinessEntityType | { Other: string };
}

/**
 * Business Entity Validation Request
 * Maps to BusinessEntityValidationRequest in Rust common-types
 */
export interface BusinessEntityValidationRequest {
  registration_number: string;
  tax_id: string;
  country_code: CountryCode;
}

/**
 * Business Entity Validation Response
 * Maps to BusinessEntityValidationResponse in Rust common-types
 */
export interface BusinessEntityValidationResponse {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}
