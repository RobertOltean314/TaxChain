/**
 * Invoice Feature Models
 * Maps to invoice-service DTOs and common-types
 */

import { CountryCode } from '../../../core/models/common.models';

/**
 * Invoice Type enum
 * Maps to InvoiceType in Rust
 */
export enum InvoiceType {
  Income = 'Income',
  Expense = 'Expense',
}

/**
 * Invoice Item
 * Maps to InvoiceItem in Rust common-types
 */
export interface InvoiceItem {
  amount: number;
  invoice_type: InvoiceType;
  description?: string;
}

/**
 * Invoice Data
 * Maps to InvoiceData in Rust common-types
 */
export interface InvoiceData {
  invoices: InvoiceItem[];
}

/**
 * Business Entity DTO (used in invoice creation)
 * Maps to BusinessEntityDto in invoice-service
 */
export interface BusinessEntityDto {
  nume: string;
  cui: string;
  adresa: string;
  platitor_tva: boolean;
}

/**
 * Line Item DTO
 * Maps to LineItemDto in invoice-service
 */
export interface LineItemDto {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate?: number;
}

/**
 * Create Invoice Request
 * Maps to CreateInvoiceRequest in invoice-service dto.rs
 */
export interface CreateInvoiceRequest {
  numar_serie: string;
  issue_date?: string; // ISO date string (NaiveDate in Rust)
  furnizor: BusinessEntityDto;
  cumparator: BusinessEntityDto;
  line_items: LineItemDto[];
}

/**
 * Invoice Response
 * Maps to InvoiceResponse in invoice-service dto.rs
 */
export interface InvoiceResponse {
  id: string; // UUID
  numar_serie: string;
  issue_date: string; // ISO date string
  baza_impozabila: number;
  total_tva: number;
  total_de_plata: number;
  furnizor_cui: string;
  cumparator_cui: string;
  created_at: string; // ISO datetime string
}

/**
 * Generic Create Invoice Request (from common-types)
 * Maps to CreateInvoiceRequest in common-types/invoice.rs
 */
export interface GenericCreateInvoiceRequest {
  numar_serie: string;
  data_emiterii: string; // ISO datetime string
  furnizor: string;
  beneficiar: string;
  total_valoare: number;
  total_tva: number;
  invoice_type: InvoiceType;
  descriere?: string;
  country_code?: CountryCode;
}

/**
 * Generic Invoice Response (from common-types)
 * Maps to InvoiceResponse in common-types/invoice.rs
 */
export interface GenericInvoiceResponse {
  id: string;
  numar_serie: string;
  data_emiterii: string; // ISO datetime string
  furnizor: string;
  beneficiar: string;
  total_valoare: number;
  total_tva: number;
  invoice_type: InvoiceType;
  descriere?: string;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}
