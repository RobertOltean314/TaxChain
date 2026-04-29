import axios from "./axios";
import type { AuditLogEntry } from "../types";

export interface AuditLogQuery {
  entity_type?: string;
  entity_id?: string;
  tip?: string;
  limit?: number;
  offset?: number;
}

export const auditApi = {
  async getLog(params: AuditLogQuery = {}): Promise<AuditLogEntry[]> {
    const res = await axios.get<{ entries: AuditLogEntry[] }>("/jurnal-audit/intrari", { params });
    return res.data.entries;
  },
};
