import api from "./axios";
import type {
  Invoice, InvoiceWithLines, InvoiceRequest,
  InvoiceStatusRequest, InvoicePaymentRequest,
} from "../types";

export const invoiceGetAll    = async (): Promise<Invoice[]> => (await api.get("/invoice")).data;
export const invoiceGetById   = async (id: string): Promise<InvoiceWithLines> => (await api.get(`/invoice/${id}`)).data;
export const invoiceCreate    = async (body: InvoiceRequest): Promise<InvoiceWithLines> => (await api.post("/invoice", body)).data;
export const invoiceUpdate    = async (id: string, body: InvoiceRequest): Promise<InvoiceWithLines> => (await api.put(`/invoice/${id}`, body)).data;
// PATCH /invoice/:id/status — body: { status: InvoiceStatus }
export const invoiceSetStatus = async (id: string, body: InvoiceStatusRequest): Promise<Invoice> => (await api.patch(`/invoice/${id}/status`, body)).data;
// PATCH /invoice/:id/payment — body: { amount: number } (not amount_paid)
export const invoiceSetPayment = async (id: string, body: InvoicePaymentRequest): Promise<Invoice> => (await api.patch(`/invoice/${id}/payment`, body)).data;
export const invoiceDelete    = async (id: string): Promise<void> => { await api.delete(`/invoice/${id}`); };
