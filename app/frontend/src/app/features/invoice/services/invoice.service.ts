/**
 * Invoice Service
 * Handles all HTTP communication with the invoice-service backend
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateInvoiceRequest,
  InvoiceResponse,
} from '../models/invoice.models';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private readonly baseUrl = `${environment.apiUrl}/invoices`;

  constructor(private http: HttpClient) {}

  /**
   * Health check for invoice service
   */
  health(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  /**
   * Create a new invoice
   */
  createInvoice(request: CreateInvoiceRequest): Observable<InvoiceResponse> {
    return this.http.post<InvoiceResponse>(this.baseUrl, request);
  }

  /**
   * Get invoice by ID
   */
  getInvoice(id: string): Observable<InvoiceResponse> {
    return this.http.get<InvoiceResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * Update invoice by ID
   */
  updateInvoice(
    id: string,
    request: CreateInvoiceRequest
  ): Observable<InvoiceResponse> {
    return this.http.put<InvoiceResponse>(`${this.baseUrl}/${id}`, request);
  }

  /**
   * Delete invoice by ID
   */
  deleteInvoice(id: string): Observable<string> {
    return this.http.delete<string>(`${this.baseUrl}/${id}`);
  }

  /**
   * List all invoices
   */
  listInvoices(): Observable<InvoiceResponse[]> {
    return this.http.get<InvoiceResponse[]>(this.baseUrl);
  }

  /**
   * Validate invoice by ID
   */
  validateInvoice(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${id}/validate`, {});
  }
}
