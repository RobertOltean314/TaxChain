// IMPORTANT: The backend route is /partener (Romanian), not /partner.
// This is confirmed from partner_handlers.rs handler names and route registration.
import api from "./axios";
import type { Partner, PartnerRequest } from "../types";

export const partenerGetAll  = async (): Promise<Partner[]> => (await api.get("/partener")).data;
export const partenerGetById = async (id: string): Promise<Partner> => (await api.get(`/partener/${id}`)).data;
export const partenerCreate  = async (body: PartnerRequest): Promise<Partner> => (await api.post("/partener", body)).data;
export const partenerUpdate  = async (id: string, body: PartnerRequest): Promise<Partner> => (await api.put(`/partener/${id}`, body)).data;
export const partenerDelete  = async (id: string): Promise<void> => { await api.delete(`/partener/${id}`); };
