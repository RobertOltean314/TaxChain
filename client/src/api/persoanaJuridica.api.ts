import api from './axios';
import type { PersoanaJuridica } from '../types';
import type { PersoanaJuridicaFormValues } from '../validation/schemas';

export const persoanaJuridicaApi = {
  getAll: async (): Promise<PersoanaJuridica[]> => {
    const { data } = await api.get<PersoanaJuridica[]>('/persoana-juridica');
    return data;
  },

  getById: async (id: string): Promise<PersoanaJuridica> => {
    const { data } = await api.get<PersoanaJuridica>(
      `/persoana-juridica/${id}`
    );
    return data;
  },

  create: async (
    payload: PersoanaJuridicaFormValues
  ): Promise<PersoanaJuridica> => {
    const { data } = await api.post<PersoanaJuridica>(
      '/persoana-juridica',
      payload
    );
    return data;
  },

  update: async (
    id: string,
    payload: PersoanaJuridicaFormValues
  ): Promise<PersoanaJuridica> => {
    const { data } = await api.put<PersoanaJuridica>(
      `/persoana-juridica/${id}`,
      payload
    );
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/persoana-juridica/${id}`);
  },
};
