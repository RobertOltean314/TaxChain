/**
 * Business Entity Service
 * Handles all HTTP communication with the business-entity-service backend
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BusinessEntity,
  CreateBusinessEntityRequest,
  BusinessEntityValidationRequest,
  BusinessEntityValidationResponse,
} from '../models/business-entity.models';

@Injectable({
  providedIn: 'root',
})
export class BusinessEntityService {
  private readonly baseUrl = `${environment.apiUrl}/entities`;

  constructor(private http: HttpClient) {}

  /**
   * Health check for business entity service
   */
  health(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  /**
   * Create a new business entity
   */
  createEntity(
    request: CreateBusinessEntityRequest
  ): Observable<BusinessEntity> {
    return this.http.post<BusinessEntity>(this.baseUrl, request);
  }

  /**
   * Get business entity by ID (CUI/registration number)
   */
  getEntity(id: string): Observable<BusinessEntity> {
    return this.http.get<BusinessEntity>(`${this.baseUrl}/${id}`);
  }

  /**
   * Update business entity by ID
   */
  updateEntity(
    id: string,
    request: CreateBusinessEntityRequest
  ): Observable<BusinessEntity> {
    return this.http.put<BusinessEntity>(`${this.baseUrl}/${id}`, request);
  }

  /**
   * Delete business entity by ID
   */
  deleteEntity(id: string): Observable<string> {
    return this.http.delete<string>(`${this.baseUrl}/${id}`);
  }

  /**
   * List all business entities
   */
  listEntities(): Observable<BusinessEntity[]> {
    return this.http.get<BusinessEntity[]>(this.baseUrl);
  }

  /**
   * Validate business entity by ID
   */
  validateEntity(id: string): Observable<BusinessEntityValidationResponse> {
    return this.http.get<BusinessEntityValidationResponse>(
      `${this.baseUrl}/${id}/validate`
    );
  }

  /**
   * Validate business entity data
   */
  validateEntityData(
    request: BusinessEntityValidationRequest
  ): Observable<BusinessEntityValidationResponse> {
    return this.http.post<BusinessEntityValidationResponse>(
      `${this.baseUrl}/validate`,
      request
    );
  }
}
