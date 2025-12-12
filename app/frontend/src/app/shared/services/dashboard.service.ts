import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardMetrics,
  Activity,
  DashboardStats,
} from '../models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Taxpayer Dashboard Methods
  getDashboardMetrics(): Observable<DashboardMetrics> {
    // TODO: Implement when auth service is ready
    // return this.http.get<DashboardMetrics>(`${this.apiUrl}/dashboard/metrics`);

    // Placeholder for now - will be replaced with actual API call
    return of({
      complianceStatus: 'Active',
      taxObligations: 0,
      currency: 'RON',
      invoicesSubmitted: 0,
      walletBalance: 0,
      walletCurrency: 'EGLD',
      walletConnected: false,
    });
  }

  getRecentActivities(limit: number = 10): Observable<Activity[]> {
    // TODO: Implement when auth service is ready
    // return this.http.get<Activity[]>(`${this.apiUrl}/dashboard/activities?limit=${limit}`);

    // Return empty array - will be populated from API
    return of([]);
  }

  getDashboardStats(): Observable<DashboardStats> {
    // TODO: Implement when auth service is ready
    // return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`);

    return of({
      nextDeadline: null,
      zkProofsGenerated: 0,
      entitiesRegistered: 0,
    });
  }
}
