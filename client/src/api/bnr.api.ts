import { api } from "./axios";
import type { BnrRate } from "../types";

export const bnrApi = {
  getRate(currency: string, date?: string): Promise<BnrRate> {
    const params: Record<string, string> = { currency };
    if (date) params.date = date;
    return api.get("/curs-bnr", { params }).then((r) => r.data);
  },
};
