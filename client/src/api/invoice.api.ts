import api from "./axios";
import type { Invoice, InvoiceWithLines } from "../types";

// ── Request payload shapes ────────────────────────────────────────────────────

export interface InvoiceLinePayload {
  description: string;
  product_code?: string;
  unit?: string;
  quantity: string; // Decimal as string
  unit_price: string; // Decimal as string
  discount_percent?: string;
  vat_rate?: "Standard" | "Reduced9" | "Reduced5" | "Exempt";
  position?: number;
}

export interface InvoicePayload {
  number: string;
  series?: string;
  document_type?: string;
  issued_date: string; // YYYY-MM-DD
  due_date?: string;
  delivery_date?: string;
  issuer_pf_id?: string;
  issuer_pj_id?: string;
  transaction_type?: "Income" | "Expense";
  partner_id: string;
  currency?: string;
  amount_paid?: string;
  reference_invoice_id?: string;
  notes?: string;
  payment_terms?: string;
  lines: InvoiceLinePayload[];
}

// ── API module ────────────────────────────────────────────────────────────────
// NOTE: URL strings point to the backend Romanian routes (/factura, /partener).
// These must not be renamed — only the TypeScript identifiers change.

export const invoiceApi = {
  getAll: async (): Promise<Invoice[]> => {
    const { data } = await api.get<Invoice[]>("/factura");
    return data;
  },

  getById: async (id: string): Promise<InvoiceWithLines> => {
    const { data } = await api.get<InvoiceWithLines>(`/factura/${id}`);
    return data;
  },

  create: async (payload: InvoicePayload): Promise<InvoiceWithLines> => {
    const { data } = await api.post<InvoiceWithLines>("/factura", payload);
    return data;
  },

  update: async (
    id: string,
    payload: InvoicePayload,
  ): Promise<InvoiceWithLines> => {
    const { data } = await api.put<InvoiceWithLines>(`/factura/${id}`, payload);
    return data;
  },

  updateStatus: async (id: string, status: string): Promise<Invoice> => {
    const { data } = await api.patch<Invoice>(`/factura/${id}/status`, {
      status,
    });
    return data;
  },

  recordPayment: async (id: string, amount: string): Promise<Invoice> => {
    const { data } = await api.patch<Invoice>(`/factura/${id}/payment`, {
      amount,
    });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/factura/${id}`);
  },

  getNextNumber: async (
    series: string,
  ): Promise<{ series: string; next_number: string }> => {
    const { data } = await api.get(
      `/factura/next-number?series=${encodeURIComponent(series)}`,
    );
    return data;
  },
};
