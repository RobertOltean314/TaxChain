import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface EntitySearchResult {
  uuid: string;
  entity_type: string;
  name: string;
  fiscal_code: string | null;
  registration_date: string | null;
  stare_fiscala: string;
}

export interface SearchResponse {
  results: EntitySearchResult[];
  total: number;
  page: number;
  per_page: number;
}

export interface MyEntitySummary {
  uuid: string;
  entity_type: string;
  name: string;
  stare_fiscala: string;
  created_at: string;
}

export interface DashboardResponse {
  wallet_address: string;
  entities: MyEntitySummary[];
  total_count: number;
}

@Injectable({
  providedIn: 'root',
})
export class EntitySearchService {
  private readonly apiUrl = `${environment.apiUrl}/api/entities`;

  constructor(private http: HttpClient) {}

  /**
   * Search for entities publicly (no authentication required)
   */
  searchEntities(
    query?: string,
    entityType?: string,
    page: number = 1,
    perPage: number = 20
  ): Observable<SearchResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    if (query) {
      params = params.set('query', query);
    }
    if (entityType) {
      params = params.set('entity_type', entityType);
    }

    return this.http.get<SearchResponse>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Get entities owned by the authenticated wallet
   */
  getMyEntities(walletAddress: string): Observable<DashboardResponse> {
    const headers = {
      Authorization: `Bearer ${walletAddress}`,
    };
    return this.http.get<DashboardResponse>(`${this.apiUrl}/my`, { headers });
  }
}
