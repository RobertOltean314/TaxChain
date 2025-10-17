/**
 * Validation Service
 * Handles all HTTP communication with the validation-service backend
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ValidationResponse,
  ComprehensiveValidationRequest,
  ComprehensiveValidationResponse,
} from '../models/validation.models';
import { CreateInvoiceRequest } from '../../invoice/models/invoice.models';
import { BusinessEntityValidationRequest } from '../../business-entity/models/business-entity.models';
import { TaxCalculationRequest } from '../../tax-calculation/models/tax-calculation.models';

@Injectable({
  providedIn: 'root',
})
export class ValidationService {
  private readonly baseUrl = `${environment.apiUrl}/validate`;

  constructor(private http: HttpClient) {}

  /**
   * Health check for validation service
   */
  health(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  /**
   * Validate an invoice
   */
  validateInvoice(
    request: CreateInvoiceRequest
  ): Observable<ValidationResponse> {
    return this.http.post<ValidationResponse>(
      `${this.baseUrl}/invoice`,
      request
    );
  }

  /**
   * Validate a business entity
   */
  validateBusinessEntity(
    request: BusinessEntityValidationRequest
  ): Observable<ValidationResponse> {
    return this.http.post<ValidationResponse>(
      `${this.baseUrl}/business-entity`,
      request
    );
  }

  /**
   * Validate a tax calculation
   */
  validateTaxCalculation(
    request: TaxCalculationRequest
  ): Observable<ValidationResponse> {
    return this.http.post<ValidationResponse>(
      `${this.baseUrl}/tax-calculation`,
      request
    );
  }

  /**
   * Perform comprehensive validation
   */
  comprehensiveValidation(
    request: ComprehensiveValidationRequest
  ): Observable<ComprehensiveValidationResponse> {
    return this.http.post<ComprehensiveValidationResponse>(
      `${this.baseUrl}/comprehensive`,
      request
    );
  }
}
