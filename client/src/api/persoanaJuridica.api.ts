import api from "./axios";
import type { PersoanaJuridica } from "../types";

export const pjGetAll    = async (): Promise<PersoanaJuridica[]> => (await api.get("/persoana-juridica")).data;
export const pjGetById   = async (id: string): Promise<PersoanaJuridica> => (await api.get(`/persoana-juridica/${id}`)).data;
export const pjCreate    = async (body: unknown): Promise<PersoanaJuridica> => (await api.post("/persoana-juridica", body)).data;
export const pjUpdate    = async (id: string, body: unknown): Promise<PersoanaJuridica> => (await api.put(`/persoana-juridica/${id}`, body)).data;
export const pjDelete    = async (id: string): Promise<void> => { await api.delete(`/persoana-juridica/${id}`); };
