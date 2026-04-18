import { api } from "./axios";
import type { VatSummary } from "../types";

export const reportApi = {
  getVatSummary(from: string, to: string): Promise<VatSummary> {
    return api.get("/reports/vat-summary", { params: { from, to } }).then((r) => r.data);
  },
};
