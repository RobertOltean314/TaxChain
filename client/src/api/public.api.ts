import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface PublicEntitySummary {
  name: string;
  fiscal_code: string;
  entity_type: "PF" | "PJ";
  proof_count: number;
}

export const publicApi = {
  listEntities: async (): Promise<PublicEntitySummary[]> => {
    const { data } = await axios.get<PublicEntitySummary[]>(
      `${BASE}/entitati/publice`,
    );
    return data;
  },
};
