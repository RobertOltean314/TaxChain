// ============================================================================
// INVOICE (Types defined early for use in constants)
// ============================================================================

export type DocumentType =
  | "TaxInvoice"
  | "Proforma"
  | "CreditNote"
  | "Receipt"
  | "DeliveryNote";

export type InvoiceStatus = "Draft" | "Issued" | "Sent" | "Paid" | "Cancelled";

export type VatRate = "Standard" | "Reduced9" | "Reduced5" | "Exempt";

// ============================================================================
// INVOICE CONSTANTS
// ============================================================================

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  Draft: "Ciornă",
  Issued: "Emisă",
  Sent: "Trimisă",
  Paid: "Plătită",
  Cancelled: "Anulată",
};

export const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  Draft: "badge bg-slate-700/50 text-slate-400",
  Issued: "badge bg-brand/15 text-brand",
  Sent: "badge bg-accent/15 text-accent",
  Paid: "badge badge-activ",
  Cancelled: "badge badge-radiata",
};

export const ALL_STATUSES: InvoiceStatus[] = [
  "Draft",
  "Issued",
  "Sent",
  "Paid",
  "Cancelled",
];

// ============================================================================
// AUTH
// ============================================================================

export interface UserResponse {
  id: string;
  email: string | null;
  display_name: string | null;
  role: "Admin" | "Taxpayer" | "Auditor";
  assigned_wallet_address: string;
  persoana_fizica_id: string | null;
  persoana_juridica_id: string | null;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: UserResponse;
}

// ============================================================================
// PERSOANA FIZICA
// ============================================================================

export interface PersoanaFizica {
  id: string;
  cnp: string;
  nume: string;
  prenume: string;
  prenume_tata: string | null;
  data_nasterii: string;
  sex: "M" | "F";
  adresa_domiciliu: string;
  cod_postal: string | null;
  iban: string;
  telefon: string | null;
  email: string | null;
  stare: "Activ" | "Inactiv" | "Suspendat";
  wallet: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PERSOANA JURIDICA
// ============================================================================

export interface PersoanaJuridica {
  id: string;
  cod_fiscal: string;
  denumire: string;
  numar_de_inregistrare_in_registrul_comertului: string;
  an_infiintare: number;
  adresa_sediu_social: string;
  cod_postal: string | null;
  adresa_puncte_de_lucru: string[] | null;
  iban: string;
  telefon: string | null;
  email: string | null;
  cod_caen_principal: string;
  coduri_caen_secundare: string[] | null;
  numar_angajati: number;
  capital_social: number;
  stare: "Activa" | "Radiata" | "Suspendata" | "InInsolventa";
  wallet: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PARTNER
// ============================================================================

export type PartnerType = "Client" | "Furnizor" | "Ambele";
export type EntityType = "PersoanaFizica" | "PersoanaJuridica";

export interface Partner {
  id: string;
  denumire: string;
  cod_fiscal: string | null;
  numar_in_registrul_comertului: string | null;
  tip: PartnerType;
  tip_entitate: EntityType;
  adresa: string | null;
  cod_postal: string | null;
  oras: string | null;
  tara: string;
  email: string | null;
  telefon: string | null;
  iban: string | null;
  persoana_fizica_id: string | null;
  persoana_juridica_id: string | null;
  owner_pf_id: string | null;
  owner_pj_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ENTITY MANAGEMENT
// ============================================================================

export interface EntitySummary {
  /** accountant_entity.id — used to remove the link */
  id: string;
  entity_type: "PF" | "PJ";
  /** The actual PF or PJ UUID */
  entity_id: string;
  /** PF: "Prenume Nume", PJ: denumire */
  name: string;
  /** PF: CNP, PJ: cod_fiscal */
  fiscal_code: string;
  created_at: string;
}

export interface BnrRate {
  currency: string;
  rate: string;
  date: string;
}

// ============================================================================
// REPORTS
// ============================================================================

export interface VatSummaryLine {
  cota_tva: string;       // "Standard" | "Reduced9" | "Reduced5" | "Exempt"
  tip_tranzactie: string; // "Venit" | "Cheltuiala" | "Necunoscut"
  base: string;
  vat: string;
}

export interface VatSummary {
  lines: VatSummaryLine[];
  income_base_total: string;
  income_vat_total: string;
  expense_base_total: string;
  expense_vat_total: string;
  net_vat: string;
  from: string;
  to: string;
}

// ============================================================================
// INVOICE MODELS
// ============================================================================

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  position: number;
  description: string;
  product_code: string | null;
  unit: string;
  // Decimal fields come back as strings from the backend
  quantity: string;
  unit_price: string;
  discount_percent: string;
  vat_rate: VatRate;
  line_subtotal: string;
  line_vat: string;
  line_total: string;
  created_at: string;
  updated_at: string;
}

export type TransactionType = "Income" | "Expense";

export interface Invoice {
  id: string;
  number: string;
  series: string | null;
  document_type: DocumentType;
  transaction_type?: TransactionType; // New field for explicit income/expense classification
  status: InvoiceStatus;
  issued_date: string;
  due_date: string | null;
  delivery_date: string | null;
  issuer_pf_id: string | null;
  issuer_pj_id: string | null;
  partner_id: string;
  currency: string;
  // Decimal fields come back as strings from the backend
  subtotal: string;
  total_vat: string;
  total: string;
  amount_paid: string;
  amount_due: string;
  reference_invoice_id: string | null;
  notes: string | null;
  payment_terms: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceWithLines {
  invoice: Invoice;
  lines: InvoiceLine[];
}
