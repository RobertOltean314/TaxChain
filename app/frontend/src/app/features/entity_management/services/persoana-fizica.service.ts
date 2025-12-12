import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  PersoanaFizicaRequest,
  PersoanaFizicaResponse,
} from '../models/entitate_fiscala.models';

@Injectable({
  providedIn: 'root',
})
export class PersoanaFizicaService {
  private apiUrl = `${environment.apiUrl}/persoana_fizica`;

  constructor(private http: HttpClient) {}

  /**
   * Get a PersoanaFizica by UUID
   */
  getById(uuid: string): Observable<PersoanaFizicaResponse> {
    return this.http.get<PersoanaFizicaResponse>(`${this.apiUrl}/${uuid}`);
  }

  /**
   * Create a new PersoanaFizica
   */
  create(data: PersoanaFizicaRequest): Observable<PersoanaFizicaResponse> {
    return this.http.post<PersoanaFizicaResponse>(this.apiUrl, data);
  }

  /**
   * Update an existing PersoanaFizica
   */
  update(
    uuid: string,
    data: PersoanaFizicaRequest
  ): Observable<PersoanaFizicaResponse> {
    return this.http.put<PersoanaFizicaResponse>(
      `${this.apiUrl}/${uuid}`,
      data
    );
  }

  /**
   * Delete a PersoanaFizica
   */
  delete(uuid: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${uuid}`);
  }
}
