import api from "./axios";
import type { FiscalProof } from "../types";

export interface VerifyResult {
  proof_id: string;
  valid: boolean;
  verified_at: string;
  public_inputs: {
    venituri_brute: string;
    cheltuieli_brute: string;
    vat_colectat: string;
    vat_deductibil: string;
  };
}

export interface PublicProfile {
  entity_name: string;
  entity_fiscal_code: string;
  entity_type: string;
  proofs: FiscalProof[];
}

export const proofApi = {
  generate: async (
    from: string,
    to: string,
  ): Promise<{ proof: FiscalProof; etherscan_url: string }> => {
    const { data } = await api.post("/reports/proof", { from, to });
    return data;
  },

  generateZk: async (
    from: string,
    to: string,
  ): Promise<{ proof: FiscalProof; etherscan_url: string }> => {
    const { data } = await api.post("/reports/proof/zk", { from, to });
    return data;
  },

  list: async (): Promise<FiscalProof[]> => {
    const { data } = await api.get<FiscalProof[]>("/reports/proofs");
    return data;
  },

  verify: async (id: string): Promise<VerifyResult> => {
    const { data } = await api.get<VerifyResult>(`/reports/proof/${id}/verify`);
    return data;
  },

  getPublicProfile: async (fiscalCode: string): Promise<PublicProfile> => {
    const { data } = await api.get<PublicProfile>(`/profil/${fiscalCode}`);
    return data;
  },

  listAll: async (filters: {
    fiscal_code?: string;
    entity_type?: string;
    from?: string;
    to?: string;
  }): Promise<FiscalProof[]> => {
    const params = new URLSearchParams();
    if (filters.fiscal_code) params.set("fiscal_code", filters.fiscal_code);
    if (filters.entity_type) params.set("entity_type", filters.entity_type);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    const { data } = await api.get<FiscalProof[]>(`/reports/proofs/all?${params}`);
    return data;
  },
};
