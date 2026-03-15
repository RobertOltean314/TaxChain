import api from "./axios";
import type { PersoanaFizica } from "../types";

export const pfGetAll    = async (): Promise<PersoanaFizica[]> => (await api.get("/persoana-fizica")).data;
export const pfGetById   = async (id: string): Promise<PersoanaFizica> => (await api.get(`/persoana-fizica/${id}`)).data;
export const pfCreate    = async (body: unknown): Promise<PersoanaFizica> => (await api.post("/persoana-fizica", body)).data;
export const pfUpdate    = async (id: string, body: unknown): Promise<PersoanaFizica> => (await api.put(`/persoana-fizica/${id}`, body)).data;
export const pfDelete    = async (id: string): Promise<void> => { await api.delete(`/persoana-fizica/${id}`); };
