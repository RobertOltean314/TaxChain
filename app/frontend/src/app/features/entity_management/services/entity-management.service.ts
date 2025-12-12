import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PersoanaFizicaRequest,
  PersoanaFizicaResponse,
  PersoanaJuridicaRequest,
  PersoanaJuridicaResponse,
  ONGRequest,
  ONGResponse,
  InstitutiePublicaRequest,
  InstitutiePublicaResponse,
  EntitateStrainaRequest,
  EntitateStrainaResponse,
} from '../models/entitate_fiscala.models';

@Injectable({
  providedIn: 'root',
})
export class EntityManagementService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  // Persoana Fizica
  getAllPersoaneFizice(): Observable<PersoanaFizicaResponse[]> {
    return this.http.get<PersoanaFizicaResponse[]>(
      `${this.apiUrl}/persoane-fizice`
    );
  }

  getPersoanaFizicaById(id: string): Observable<PersoanaFizicaResponse> {
    return this.http.get<PersoanaFizicaResponse>(
      `${this.apiUrl}/persoane-fizice/${id}`
    );
  }

  createPersoanaFizica(
    data: PersoanaFizicaRequest
  ): Observable<PersoanaFizicaResponse> {
    return this.http.post<PersoanaFizicaResponse>(
      `${this.apiUrl}/persoane-fizice`,
      data
    );
  }

  updatePersoanaFizica(
    id: string,
    data: PersoanaFizicaRequest
  ): Observable<PersoanaFizicaResponse> {
    return this.http.put<PersoanaFizicaResponse>(
      `${this.apiUrl}/persoane-fizice/${id}`,
      data
    );
  }

  deletePersoanaFizica(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/persoane-fizice/${id}`);
  }

  // Persoana Juridica
  getAllPersoaneJuridice(): Observable<PersoanaJuridicaResponse[]> {
    return this.http.get<PersoanaJuridicaResponse[]>(
      `${this.apiUrl}/persoane-juridice`
    );
  }

  getPersoanaJuridicaById(id: string): Observable<PersoanaJuridicaResponse> {
    return this.http.get<PersoanaJuridicaResponse>(
      `${this.apiUrl}/persoane-juridice/${id}`
    );
  }

  createPersoanaJuridica(
    data: PersoanaJuridicaRequest
  ): Observable<PersoanaJuridicaResponse> {
    return this.http.post<PersoanaJuridicaResponse>(
      `${this.apiUrl}/persoane-juridice`,
      data
    );
  }

  updatePersoanaJuridica(
    id: string,
    data: PersoanaJuridicaRequest
  ): Observable<PersoanaJuridicaResponse> {
    return this.http.put<PersoanaJuridicaResponse>(
      `${this.apiUrl}/persoane-juridice/${id}`,
      data
    );
  }

  deletePersoanaJuridica(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/persoane-juridice/${id}`);
  }

  // ONG
  getAllONGs(): Observable<ONGResponse[]> {
    return this.http.get<ONGResponse[]>(`${this.apiUrl}/ongs`);
  }

  getONGById(id: string): Observable<ONGResponse> {
    return this.http.get<ONGResponse>(`${this.apiUrl}/ongs/${id}`);
  }

  createONG(data: ONGRequest): Observable<ONGResponse> {
    return this.http.post<ONGResponse>(`${this.apiUrl}/ongs`, data);
  }

  updateONG(id: string, data: ONGRequest): Observable<ONGResponse> {
    return this.http.put<ONGResponse>(`${this.apiUrl}/ongs/${id}`, data);
  }

  deleteONG(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/ongs/${id}`);
  }

  // Institutie Publica
  getAllInstitutiiPublice(): Observable<InstitutiePublicaResponse[]> {
    return this.http.get<InstitutiePublicaResponse[]>(
      `${this.apiUrl}/institutii-publice`
    );
  }

  getInstitutiePublicaById(id: string): Observable<InstitutiePublicaResponse> {
    return this.http.get<InstitutiePublicaResponse>(
      `${this.apiUrl}/institutii-publice/${id}`
    );
  }

  createInstitutiePublica(
    data: InstitutiePublicaRequest
  ): Observable<InstitutiePublicaResponse> {
    return this.http.post<InstitutiePublicaResponse>(
      `${this.apiUrl}/institutii-publice`,
      data
    );
  }

  updateInstitutiePublica(
    id: string,
    data: InstitutiePublicaRequest
  ): Observable<InstitutiePublicaResponse> {
    return this.http.put<InstitutiePublicaResponse>(
      `${this.apiUrl}/institutii-publice/${id}`,
      data
    );
  }

  deleteInstitutiePublica(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/institutii-publice/${id}`);
  }

  // Entitate Straina
  getAllEntitatiStraine(): Observable<EntitateStrainaResponse[]> {
    return this.http.get<EntitateStrainaResponse[]>(
      `${this.apiUrl}/entitati-straine`
    );
  }

  getEntitateStrainaById(id: string): Observable<EntitateStrainaResponse> {
    return this.http.get<EntitateStrainaResponse>(
      `${this.apiUrl}/entitati-straine/${id}`
    );
  }

  createEntitateStraina(
    data: EntitateStrainaRequest
  ): Observable<EntitateStrainaResponse> {
    return this.http.post<EntitateStrainaResponse>(
      `${this.apiUrl}/entitati-straine`,
      data
    );
  }

  updateEntitateStraina(
    id: string,
    data: EntitateStrainaRequest
  ): Observable<EntitateStrainaResponse> {
    return this.http.put<EntitateStrainaResponse>(
      `${this.apiUrl}/entitati-straine/${id}`,
      data
    );
  }

  deleteEntitateStraina(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/entitati-straine/${id}`);
  }
}
