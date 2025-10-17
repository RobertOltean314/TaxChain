/**
 * ZK Proof Service
 * Handles all HTTP communication with the zk-proof-service backend
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ZkProofRequest,
  ZkProofResponse,
  ZkProofVerificationRequest,
  ZkProofVerificationResponse,
} from '../models/zk-proof.models';

@Injectable({
  providedIn: 'root',
})
export class ZkProofService {
  private readonly baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  /**
   * Health check for ZK proof service
   */
  health(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  /**
   * Generate a zero-knowledge proof
   */
  generateProof(request: ZkProofRequest): Observable<ZkProofResponse> {
    return this.http.post<ZkProofResponse>(`${this.baseUrl}/generate`, request);
  }

  /**
   * Verify a zero-knowledge proof
   */
  verifyProof(
    request: ZkProofVerificationRequest
  ): Observable<ZkProofVerificationResponse> {
    return this.http.post<ZkProofVerificationResponse>(
      `${this.baseUrl}/verify`,
      request
    );
  }

  /**
   * Get proof by calculation ID
   */
  getProof(calculationId: string): Observable<ZkProofResponse> {
    return this.http.get<ZkProofResponse>(
      `${this.baseUrl}/proof/${calculationId}`
    );
  }
}
