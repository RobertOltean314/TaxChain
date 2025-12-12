import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  GovernmentMetrics,
  ComplianceTrend,
  EntityTypeDistribution,
  RecentVerification,
} from '../models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class GovernmentDashboardService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Government Dashboard Methods
  getGovernmentMetrics(): Observable<GovernmentMetrics> {
    // TODO: Implement when auth service is ready
    // return this.http.get<GovernmentMetrics>(`${this.apiUrl}/government/metrics`);

    return of({
      totalTaxpayers: 0,
      complianceRate: 0,
      revenueCollected: 0,
      currency: 'RON',
      zkProofsVerified: 0,
      totalProofs: 0,
      avgResponseTime: 0,
      systemUptime: 99.9,
      transactionsToday: 0,
    });
  }

  getComplianceTrends(
    period: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): Observable<ComplianceTrend[]> {
    // TODO: Implement when auth service is ready
    // return this.http.get<ComplianceTrend[]>(`${this.apiUrl}/government/compliance-trends?period=${period}`);

    return of([]);
  }

  getEntityTypeDistribution(): Observable<EntityTypeDistribution[]> {
    // TODO: Implement when auth service is ready
    // return this.http.get<EntityTypeDistribution[]>(`${this.apiUrl}/government/entity-distribution`);

    return of([]);
  }

  getRecentVerifications(limit: number = 10): Observable<RecentVerification[]> {
    // TODO: Implement when auth service is ready
    // return this.http.get<RecentVerification[]>(`${this.apiUrl}/government/recent-verifications?limit=${limit}`);

    return of([]);
  }
}
