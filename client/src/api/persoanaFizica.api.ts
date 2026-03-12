import api from './axios';
import type { PersoanaFizica } from '../types';
import type { PersoanaFizicaFormValues } from '../validation/schemas';

export const persoanaFizicaApi = {
  getAll: async (): Promise<PersoanaFizica[]> => {
    const { data } = await api.get<PersoanaFizica[]>('/persoana-fizica');
    return data;
  },

  getById: async (id: string): Promise<PersoanaFizica> => {
    const { data } = await api.get<PersoanaFizica>(`/persoana-fizica/${id}`);
    return data;
  },

  create: async (payload: PersoanaFizicaFormValues): Promise<PersoanaFizica> => {
    const { data } = await api.post<PersoanaFizica>('/persoana-fizica', payload);
    return data;
  },

  update: async (
    id: string,
    payload: PersoanaFizicaFormValues
  ): Promise<PersoanaFizica> => {
    const { data } = await api.put<PersoanaFizica>(
      `/persoana-fizica/${id}`,
      payload
    );
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/persoana-fizica/${id}`);
  },
};
