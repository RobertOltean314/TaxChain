import { z } from "zod";
import type { PartnerType, EntityType, VatRate, DocumentType } from "../types";

// ============================================================================
// ROMANIAN VALIDATORS (matching backend rules)
// ============================================================================

const validateCNP = (cnp: string): boolean => {
  if (!/^\d{13}$/.test(cnp)) return false;

  const CONTROL_KEY = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  const digits = cnp.split("").map((d) => parseInt(d, 10));

  // Sex digit must be 1-8
  if (digits[0] < 1 || digits[0] > 8) return false;

  // Checksum validation
  const sum = digits
    .slice(0, 12)
    .reduce((acc, d, i) => acc + d * CONTROL_KEY[i], 0);
  const remainder = sum % 11;
  const expectedControl = remainder === 10 ? 1 : remainder;

  return digits[12] === expectedControl;
};

const validateIBAN = (iban: string): boolean => {
  if (!/^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(iban)) return false;

  // IBAN mod-97 checksum
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged
    .split("")
    .map((c) => {
      if (c >= "A" && c <= "Z") {
        return (c.charCodeAt(0) - "A".charCodeAt(0) + 10).toString();
      }
      return c;
    })
    .join("");

  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }

  return remainder === 1;
};

const validatePhoneRo = (phone: string): boolean => {
  return /^(?:\+40|0)7\d{8}$/.test(phone);
};

const validatePostalCode = (code: string): boolean => {
  return /^\d{6}$/.test(code);
};

const validateCAEN = (caen: string): boolean => {
  // CAEN format: 4 digits optionally followed by .XX
  return /^\d{4}(?:\.\d{2})?$/.test(caen);
};

const validateTradeRegisterNumber = (nr: string): boolean => {
  // Format: J/[county code]/[number] e.g., J12/123/2020
  return /^J\/\d{2}\/\d+$/.test(nr);
};

// ============================================================================
// DATE VALIDATORS
// ============================================================================

const pastDateOrToday = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data trebuie în format YYYY-MM-DD")
  .refine((date) => new Date(date) <= new Date(), "Data nu poate fi în viitor");

const futureDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data trebuie în format YYYY-MM-DD")
  .optional()
  .refine(
    (date) => !date || new Date(date) > new Date(),
    "Data trebuie să fie în viitor",
  );

// ============================================================================
// PERSOANA FIZICA SCHEMA
// ============================================================================

export const persoanaFizicaSchema = z.object({
  cnp: z
    .string()
    .min(13, "CNP trebuie să aibă 13 caractere")
    .max(13, "CNP trebuie să aibă 13 caractere")
    .refine(validateCNP, "CNP este invalid"),
  nume: z
    .string()
    .min(1, "Numele este obligatoriu")
    .max(100, "Numele nu poate depăși 100 caractere"),
  prenume: z
    .string()
    .min(1, "Prenumele este obligatoriu")
    .max(100, "Prenumele nu poate depăși 100 caractere"),
  prenume_tata: z
    .string()
    .max(100, "Prenumele tații nu poate depăși 100 caractere")
    .optional()
    .nullable(),
  data_nasterii: pastDateOrToday,
  sex: z
    .enum(["M", "F"])
    .catch("M")
    .refine((v) => ["M", "F"].includes(v), "Sexul trebuie să fie M sau F"),
  adresa_domiciliu: z
    .string()
    .min(5, "Adresa trebuie să aibă minim 5 caractere")
    .max(200, "Adresa nu poate depăși 200 caractere"),
  cod_postal: z
    .string()
    .refine(validatePostalCode, "Codul poștal trebuie să conțină 6 cifre")
    .optional()
    .nullable(),
  iban: z.string().refine(validateIBAN, "IBAN invalid"),
  telefon: z
    .string()
    .refine(validatePhoneRo, "Telefon invalid (format: +40 sau 0 + 7xxxxxxxx)")
    .optional()
    .nullable(),
  email: z.string().email("Email invalid").optional().nullable(),
  stare: z
    .enum(["Activ", "Inactiv", "Suspendat"])
    .refine(
      (v) => ["Activ", "Inactiv", "Suspendat"].includes(v),
      "Stare validă: Activ, Inactiv, Suspendat",
    ),
});

export type PersoanaFizicaFormValues = z.infer<typeof persoanaFizicaSchema>;

// ============================================================================
// PERSOANA JURIDICA SCHEMA
// ============================================================================

export const persoanaJuridicaSchema = z.object({
  cod_fiscal: z
    .string()
    .min(1, "Codul fiscal este obligatoriu")
    .max(20, "Codul fiscal nu poate depăși 20 caractere"),
  denumire: z
    .string()
    .min(1, "Denumirea este obligatorie")
    .max(200, "Denumirea nu poate depăși 200 caractere"),
  numar_de_inregistrare_in_registrul_comertului: z
    .string()
    .refine(validateTradeRegisterNumber, "Formatul invalid: trebuie J/XX/NNNN"),
  an_infiintare: z
    .number()
    .int()
    .min(1900, "Anul trebuie să fie după 1900")
    .max(new Date().getFullYear(), "Anul nu poate fi în viitor"),
  adresa_sediu_social: z
    .string()
    .min(5, "Adresa trebuie să aibă minim 5 caractere")
    .max(200, "Adresa nu poate depăși 200 caractere"),
  cod_postal: z
    .string()
    .refine(validatePostalCode, "Codul poștal trebuie să conțină 6 cifre")
    .optional()
    .nullable(),
  adresa_puncte_de_lucru: z.array(z.string()).optional().nullable(),
  iban: z.string().refine(validateIBAN, "IBAN invalid"),
  telefon: z
    .string()
    .refine(validatePhoneRo, "Telefon invalid")
    .optional()
    .nullable(),
  email: z.string().email("Email invalid").optional().nullable(),
  cod_caen_principal: z
    .string()
    .refine(validateCAEN, "CAEN invalid (format: NNNN sau NNNN.XX)"),
  coduri_caen_secundare: z
    .array(z.string().refine(validateCAEN, "CAEN invalid"))
    .optional()
    .nullable(),
  numar_angajati: z
    .number()
    .int()
    .min(0, "Numărul de angajați nu poate fi negativ"),
  capital_social: z.number().min(0, "Capitalul social nu poate fi negativ"),
  stare: z
    .enum(["Activa", "Radiata", "Suspendata", "InInsolventa"])
    .refine(
      (v) => ["Activa", "Radiata", "Suspendata", "InInsolventa"].includes(v),
      "Stare validă: Activa, Radiata, Suspendata, InInsolventa",
    ),
});

export type PersoanaJuridicaFormValues = z.infer<typeof persoanaJuridicaSchema>;

// ============================================================================
// PARTNER SCHEMA
// ============================================================================

export const partnerSchema = z.object({
  denumire: z
    .string()
    .min(1, "Denumirea este obligatorie")
    .max(200, "Denumirea nu poate depăși 200 caractere"),
  cod_fiscal: z
    .string()
    .max(20, "Codul fiscal nu poate depăși 20 caractere")
    .optional()
    .nullable(),
  numar_in_registrul_comertului: z
    .string()
    .max(50, "Numărul în registrul comerțului nu poate depăși 50 caractere")
    .optional()
    .nullable(),
  tip: z
    .enum(["Client", "Furnizor", "Ambele"])
    .refine(
      (v) => ["Client", "Furnizor", "Ambele"].includes(v),
      "Tip valid: Client, Furnizor, Ambele",
    ),
  tip_entitate: z
    .enum(["PersoanaFizica", "PersoanaJuridica"])
    .refine(
      (v) => ["PersoanaFizica", "PersoanaJuridica"].includes(v),
      "Tip entitate: PersoanaFizica sau PersoanaJuridica",
    ),
  adresa: z
    .string()
    .min(5, "Adresa trebuie să aibă minim 5 caractere")
    .max(200, "Adresa nu poate depăși 200 caractere")
    .optional()
    .nullable(),
  cod_postal: z
    .string()
    .refine(validatePostalCode, "Cod poștal invalid")
    .optional()
    .nullable(),
  oras: z
    .string()
    .max(100, "Orașul nu poate depăși 100 caractere")
    .optional()
    .nullable(),
  tara: z
    .string()
    .min(1, "Țara este obligatorie")
    .max(100, "Țara nu poate depăși 100 caractere")
    .default("România"),
  email: z.string().email("Email invalid").optional().nullable(),
  telefon: z
    .string()
    .refine(validatePhoneRo, "Telefon invalid")
    .optional()
    .nullable(),
  iban: z.string().refine(validateIBAN, "IBAN invalid").optional().nullable(),
  persoana_fizica_id: z.string().uuid("ID invalid").optional().nullable(),
  persoana_juridica_id: z.string().uuid("ID invalid").optional().nullable(),
});

export type PartnerFormValues = z.infer<typeof partnerSchema>;

// ============================================================================
// INVOICE LINE SCHEMA
// ============================================================================

export const invoiceLineSchema = z.object({
  description: z
    .string()
    .min(1, "Descrierea este obligatorie")
    .max(500, "Descrierea nu poate depăși 500 caractere"),
  product_code: z
    .string()
    .max(50, "Codul produsului nu poate depăși 50 caractere")
    .optional()
    .nullable(),
  unit: z
    .string()
    .min(1, "Unitatea de măsură este obligatorie")
    .max(20, "Unitatea nu poate depăși 20 caractere")
    .default("buc"),
  quantity: z
    .string()
    .refine(
      (q) => !isNaN(parseFloat(q)) && parseFloat(q) > 0,
      "Cantitatea trebuie să fie un număr pozitiv",
    ),
  unit_price: z
    .string()
    .refine(
      (p) => !isNaN(parseFloat(p)) && parseFloat(p) >= 0,
      "Prețul trebuie să fie un număr pozitiv",
    ),
  discount_percent: z
    .string()
    .refine(
      (d) =>
        !isNaN(parseFloat(d)) && parseFloat(d) >= 0 && parseFloat(d) <= 100,
      "Discountul trebuie să fie între 0 și 100",
    )
    .default("0"),
  vat_rate: z
    .enum(["Standard", "Reduced9", "Reduced5", "Exempt"])
    .refine(
      (v) => ["Standard", "Reduced9", "Reduced5", "Exempt"].includes(v),
      "Cota validă: Standard (19%), Reduced9 (9%), Reduced5 (5%), Exempt (0%)",
    )
    .default("Standard"),
});

export type InvoiceLineFormValues = z.infer<typeof invoiceLineSchema>;

// ============================================================================
// INVOICE SCHEMA
// ============================================================================

export const invoiceSchema = z.object({
  number: z
    .string()
    .min(1, "Numărul facturii este obligatoriu")
    .max(50, "Numărul nu poate depăși 50 caractere"),
  series: z
    .string()
    .max(20, "Seria nu poate depăși 20 caractere")
    .default("FC"),
  document_type: z
    .enum(["TaxInvoice", "Proforma", "CreditNote", "Receipt", "DeliveryNote"])
    .refine(
      (v) =>
        [
          "TaxInvoice",
          "Proforma",
          "CreditNote",
          "Receipt",
          "DeliveryNote",
        ].includes(v),
      "Tip document valid: TaxInvoice, Proforma, CreditNote, Receipt, DeliveryNote",
    )
    .default("TaxInvoice"),
  transaction_type: z.enum(["Income", "Expense"]).optional().nullable(),
  issued_date: pastDateOrToday,
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data scadenței trebuie în format YYYY-MM-DD")
    .optional()
    .nullable(),
  delivery_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data livrării trebuie în format YYYY-MM-DD")
    .optional()
    .nullable(),
  issuer_pf_id: z.string().uuid("ID invalid").optional().nullable(),
  issuer_pj_id: z.string().uuid("ID invalid").optional().nullable(),
  partner_id: z.string().uuid("Partenul este obligatoriu"),
  currency: z.enum(["RON", "EUR", "USD"]).default("RON"),
  notes: z
    .string()
    .max(1000, "Notele nu pot depăși 1000 caractere")
    .optional()
    .nullable(),
  payment_terms: z
    .string()
    .max(200, "Condițiile de plată nu pot depăși 200 caractere")
    .optional()
    .nullable(),
  lines: z
    .array(invoiceLineSchema)
    .min(1, "Factura trebuie să aibă cel puțin o linie"),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

// ============================================================================
// PAYMENT SCHEMA
// ============================================================================

export const paymentSchema = z.object({
  amount: z
    .string()
    .refine(
      (a) => !isNaN(parseFloat(a)) && parseFloat(a) > 0,
      "Suma trebuie să fie un număr pozitiv",
    ),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

// ============================================================================
// STATUS CHANGE SCHEMA
// ============================================================================

export const statusChangeSchema = z.object({
  status: z
    .enum(["Draft", "Issued", "Sent", "Paid", "Cancelled"])
    .refine(
      (v) => ["Draft", "Issued", "Sent", "Paid", "Cancelled"].includes(v),
      "Stare validă: Draft, Issued, Sent, Paid, Cancelled",
    ),
});

export type StatusChangeFormValues = z.infer<typeof statusChangeSchema>;

// ============================================================================
// TRIM HELPER — apply to form values before submitting to the API
// Recursively trims all string values in a plain object.
// ============================================================================

type DeepTrim<T> = T extends string
  ? string
  : T extends (infer U)[]
    ? DeepTrim<U>[]
    : T extends object
      ? { [K in keyof T]: DeepTrim<T[K]> }
      : T;

export function trimStrings<T>(obj: T): DeepTrim<T> {
  if (typeof obj === "string") return obj.trim() as DeepTrim<T>;
  if (Array.isArray(obj))
    return obj.map(trimStrings) as DeepTrim<T>;
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as object).map(([k, v]) => [k, trimStrings(v)]),
    ) as DeepTrim<T>;
  }
  return obj as DeepTrim<T>;
}
