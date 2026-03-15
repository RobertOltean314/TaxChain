// ─── Auth ─────────────────────────────────────────────────────────────────────
// Matches AuthResponse in auth_handlers.rs and UserResponse::from(user)

export interface UserResponse {
  id: string;                          // Uuid
  email: string | null;
  display_name: string | null;
  role: "Admin" | "Taxpayer" | "Auditor";
  assigned_wallet_address: string;
  persoana_fizica_id: string | null;   // Uuid FK, nullable
  persoana_juridica_id: string | null; // Uuid FK, nullable
  is_active: boolean;
  created_at: string;                  // DateTime<Utc>
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: UserResponse;
}

// ─── PersoanaFizica ───────────────────────────────────────────────────────────

export interface PersoanaFizica {
  id: string;
  cnp: string;
  nume: string;
  prenume: string;
  prenume_tata: string | null;
  data_nasterii: string;               // "YYYY-MM-DD"
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

// ─── PersoanaJuridica ─────────────────────────────────────────────────────────

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

// ─── Partner ──────────────────────────────────────────────────────────────────
// IMPORTANT: backend route is /partener (Romanian spelling), not /partner
// Field names from partner_model.rs exactly

export type PartnerTip       = "Furnizor" | "Client" | "Ambele";
export type PartnerTipEntity = "PersoanaJuridica" | "PersoanaFizica";

export interface Partner {
  id: string;
  denumire: string;
  cod_fiscal: string | null;
  numar_in_registrul_comertului: string | null;
  tip: PartnerTip;
  tip_entitate: PartnerTipEntity;
  adresa: string | null;
  cod_postal: string | null;
  oras: string | null;
  tara: string;                        // defaults to "Romania"
  email: string | null;
  telefon: string | null;
  iban: string | null;
  persoana_fizica_id: string | null;
  persoana_juridica_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Matches PartnerRequest in partner_model.rs
// All optional fields map to Option<> in Rust
export interface PartnerRequest {
  denumire: string;
  cod_fiscal?: string | null;
  numar_in_registrul_comertului?: string | null;
  tip?: PartnerTip | null;
  tip_entitate?: PartnerTipEntity | null;
  adresa?: string | null;
  cod_postal?: string | null;
  oras?: string | null;
  tara?: string | null;                // backend defaults to "Romania"
  email?: string | null;
  telefon?: string | null;
  iban?: string | null;
  persoana_fizica_id?: string | null;
  persoana_juridica_id?: string | null;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────
// Field names from invoice_model.rs exactly

export type DocumentType =
  | "TaxInvoice" | "Proforma" | "CreditNote" | "Receipt" | "DeliveryNote";

export type InvoiceStatus = "Draft" | "Issued" | "Sent" | "Paid" | "Cancelled";

// VatRate variants from invoice_model.rs
export type VatRate = "Standard" | "Reduced9" | "Reduced5" | "Exempt";

export interface Invoice {
  id: string;
  number: string;
  series: string | null;
  document_type: DocumentType;
  status: InvoiceStatus;
  issued_date: string;                 // NaiveDate → "YYYY-MM-DD"
  due_date: string | null;
  delivery_date: string | null;
  issuer_pf_id: string | null;
  issuer_pj_id: string | null;
  partner_id: string;
  currency: string;
  subtotal: number;
  total_vat: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  reference_invoice_id: string | null;
  notes: string | null;
  payment_terms: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  position: number;
  description: string;
  product_code: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  vat_rate: VatRate;
  line_subtotal: number;
  line_vat: number;
  line_total: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceWithLines {
  invoice: Invoice;
  lines: InvoiceLine[];
}

// Matches InvoiceRequest in invoice_model.rs
export interface InvoiceLineRequest {
  position?: number | null;
  description: string;
  product_code?: string | null;
  unit?: string | null;                // defaults to "pcs"
  quantity: number;
  unit_price: number;
  discount_percent?: number | null;    // defaults to 0
  vat_rate?: VatRate | null;           // defaults to Standard
}

export interface InvoiceRequest {
  number: string;                      // required, 1–50 chars
  series?: string | null;
  document_type?: DocumentType | null; // defaults to TaxInvoice
  issued_date: string;                 // "YYYY-MM-DD"
  due_date?: string | null;
  delivery_date?: string | null;
  issuer_pf_id?: string | null;        // at least one issuer required
  issuer_pj_id?: string | null;
  partner_id: string;                  // required UUID
  currency?: string | null;            // defaults to "RON"
  amount_paid?: number | null;
  reference_invoice_id?: string | null;
  notes?: string | null;
  payment_terms?: string | null;
  lines: InvoiceLineRequest[];         // must be non-empty
}

// PATCH /invoice/:id/status — body: InvoiceStatusRequest
export interface InvoiceStatusRequest {
  status: InvoiceStatus;
}

// PATCH /invoice/:id/payment — body: InvoicePaymentRequest
// Field is "amount" (Decimal), not "amount_paid"
export interface InvoicePaymentRequest {
  amount: number;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const PARTNER_TIP_LABELS: Record<PartnerTip, string> = {
  Client:   "Client",
  Furnizor: "Furnizor",
  Ambele:   "Client & Furnizor",
};

export const PARTNER_ENTITY_LABELS: Record<PartnerTipEntity, string> = {
  PersoanaFizica:   "Persoană Fizică",
  PersoanaJuridica: "Persoană Juridică",
};

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  TaxInvoice:   "Factură Fiscală",
  Proforma:     "Factură Proformă",
  CreditNote:   "Notă de Credit",
  Receipt:      "Chitanță",
  DeliveryNote: "Aviz de Expediție",
};

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  Draft:     "Ciornă",
  Issued:    "Emisă",
  Sent:      "Trimisă",
  Paid:      "Plătită",
  Cancelled: "Anulată",
};

export const VAT_LABELS: Record<VatRate, string> = {
  Standard: "19%",
  Reduced9: "9%",
  Reduced5: "5%",
  Exempt:   "0%",
};

export const VAT_MULT: Record<VatRate, number> = {
  Standard: 0.19,
  Reduced9: 0.09,
  Reduced5: 0.05,
  Exempt:   0,
};

// Valid next statuses per current status (from invoice_model.rs can_transition_to)
export const NEXT_STATUSES: Record<InvoiceStatus, InvoiceStatus[]> = {
  Draft:     ["Issued", "Cancelled"],
  Issued:    ["Sent",   "Cancelled"],
  Sent:      ["Paid",   "Cancelled"],
  Paid:      [],
  Cancelled: [],
};
