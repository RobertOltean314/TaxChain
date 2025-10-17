/**
 * Tax Calculation Service
 * Handles all HTTP communication with the tax-calculation-service backend
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  TaxCalculationRequest,
  TaxCalculationResponse,
} from '../models/tax-calculation.models';

@Injectable({
  providedIn: 'root',
})
export class TaxCalculationService {
  private readonly baseUrl = `${environment.apiUrl}/calculate`;

  constructor(private http: HttpClient) {}

  /**
   * Health check for tax calculation service
   */
  health(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  /**
   * Calculate tax for provided invoice data
   */
  calculateTax(
    request: TaxCalculationRequest
  ): Observable<TaxCalculationResponse> {
    return this.http.post<TaxCalculationResponse>(this.baseUrl, request);
  }

  /**
   * Get available tax rates for all countries
   */
  getTaxRates(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/rates`);
  }

  /**
   * Get tax rates for a specific country
   */
  getTaxRatesByCountry(countryCode: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/rates/${countryCode}`);
  }
}
