import api from "./axios";
import type { Partner, PartnerType, EntityType } from "../types";

export interface PartnerPayload {
  denumire: string;
  cod_fiscal?: string;
  numar_in_registrul_comertului?: string;
  tip?: PartnerType;
  tip_entitate?: EntityType;
  adresa?: string;
  cod_postal?: string;
  oras?: string;
  tara?: string;
  email?: string;
  telefon?: string;
  iban?: string;
  persoana_fizica_id?: string;
  persoana_juridica_id?: string;
}

// NOTE: URL strings point to the backend Romanian route /partener.
// These must not be renamed — only the TypeScript identifiers change.

export const partnerApi = {
  getAll: async (): Promise<Partner[]> => {
    const { data } = await api.get<Partner[]>("/partener");
    return data;
  },

  getById: async (id: string): Promise<Partner> => {
    const { data } = await api.get<Partner>(`/partener/${id}`);
    return data;
  },

  create: async (payload: PartnerPayload): Promise<Partner> => {
    const { data } = await api.post<Partner>("/partener", payload);
    return data;
  },

  update: async (id: string, payload: PartnerPayload): Promise<Partner> => {
    const { data } = await api.put<Partner>(`/partener/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/partener/${id}`);
  },
};
