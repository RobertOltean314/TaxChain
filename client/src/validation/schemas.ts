import { z } from 'zod';

// ─── Shared validators ─────────────────────────────────────────────────────────

const ibanSchema = z
  .string()
  .regex(/^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/, 'Format IBAN invalid (RO##XXXX######)')
  .refine((iban) => {
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    const numeric = rearranged
      .split('')
      .map((c) => (/[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c))
      .join('');
    let remainder = 0n;
    for (const ch of numeric) {
      remainder = (remainder * 10n + BigInt(ch)) % 97n;
    }
    return remainder === 1n;
  }, 'Suma de control IBAN invalidă');

const telefonSchema = z
  .string()
  .optional()
  .refine(
    (v) => !v || /^(\+40\d{9}|07\d{8})$/.test(v),
    'Telefon invalid (+40XXXXXXXXX sau 07XXXXXXXX)'
  );

const codPostalSchema = z
  .string()
  .optional()
  .refine((v) => !v || /^\d{6}$/.test(v), 'Codul poștal trebuie să aibă 6 cifre');

// ─── CNP validator ─────────────────────────────────────────────────────────────

function validateCnp(cnp: string): boolean {
  if (!/^\d{13}$/.test(cnp)) return false;
  const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  const digits = cnp.split('').map(Number);
  const countyCode = parseInt(cnp.slice(7, 9), 10);
  if (countyCode < 1 || countyCode > 52) return false;
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
  const remainder = sum % 11;
  const checkDigit = remainder < 10 ? remainder : 1;
  return digits[12] === checkDigit;
}

// ─── CIF (Cod Fiscal) validator ────────────────────────────────────────────────

function validateCif(cif: string): boolean {
  const clean = cif.replace(/^RO/i, '');
  if (!/^\d{2,10}$/.test(clean)) return false;
  const weights = [7, 5, 3, 1, 7, 5, 3, 1];
  const digits = clean.split('').map(Number);
  const checkDigit = digits.pop()!;
  while (digits.length < 8) digits.unshift(0);
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
  const computed = (sum * 10) % 11 === 10 ? 0 : (sum * 10) % 11;
  return computed === checkDigit;
}

// ─── Persoana Fizica schema ────────────────────────────────────────────────────

export const persoanaFizicaSchema = z.object({
  cnp: z
    .string()
    .length(13, 'CNP-ul trebuie să aibă exact 13 cifre')
    .regex(/^\d{13}$/, 'CNP-ul trebuie să conțină doar cifre')
    .refine(validateCnp, 'CNP invalid (suma de control incorectă)'),

  nume: z
    .string()
    .min(1, 'Numele este obligatoriu')
    .max(50, 'Numele poate avea maxim 50 de caractere'),

  prenume: z
    .string()
    .min(1, 'Prenumele este obligatoriu')
    .max(50, 'Prenumele poate avea maxim 50 de caractere'),

  prenume_tata: z
    .string()
    .max(30, 'Prenumele tatălui poate avea maxim 30 de caractere')
    .optional()
    .or(z.literal('')),

  data_nasterii: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data nașterii trebuie în format YYYY-MM-DD'),

  sex: z.enum(['M', 'F']),

  adresa_domiciliu: z
    .string()
    .min(1, 'Adresa de domiciliu este obligatorie')
    .max(200, 'Adresa poate avea maxim 200 de caractere'),

  cod_postal: codPostalSchema,

  iban: ibanSchema,

  telefon: telefonSchema,

  email: z
    .string()
    .email('Adresă de email invalidă')
    .optional()
    .or(z.literal('')),

  stare: z
    .enum(['Activ', 'Inactiv', 'Suspendat'])
    .optional()
    .default('Activ'),

  wallet: z
    .string()
    .max(100, 'Adresa wallet poate avea maxim 100 de caractere')
    .optional()
    .or(z.literal('')),
});

export type PersoanaFizicaFormValues = z.infer<typeof persoanaFizicaSchema>;

// ─── Persoana Juridica schema ─────────────────────────────────────────────────

export const persoanaJuridicaSchema = z.object({
  cod_fiscal: z
    .string()
    .min(2, 'CIF-ul trebuie să aibă minim 2 caractere')
    .max(10, 'CIF-ul poate avea maxim 10 caractere')
    .refine(validateCif, 'CIF invalid'),

  denumire: z
    .string()
    .min(1, 'Denumirea este obligatorie')
    .max(100, 'Denumirea poate avea maxim 100 de caractere'),

  numar_de_inregistrare_in_registrul_comertului: z
    .string()
    .regex(/^J\d{2}\/\d{6}\/\d{2}$/, 'Format invalid (ex: J40/123456/24)'),

  an_infiintare: z
    .number()
    .int()
    .min(1850, 'Anul înființării trebuie să fie cel puțin 1850')
    .max(new Date().getFullYear(), `Anul nu poate fi în viitor`),

  adresa_sediu_social: z
    .string()
    .min(1, 'Adresa sediului social este obligatorie')
    .max(200, 'Adresa poate avea maxim 200 de caractere'),

  cod_postal: codPostalSchema,

  adresa_puncte_de_lucru: z.array(z.string()).optional(),

  iban: ibanSchema,

  telefon: telefonSchema,

  email: z
    .string()
    .email('Adresă de email invalidă')
    .optional()
    .or(z.literal('')),

  cod_caen_principal: z
    .string()
    .regex(/^\d{4}$/, 'Codul CAEN trebuie să aibă exact 4 cifre'),

  coduri_caen_secundare: z.array(z.string()).optional(),

  numar_angajati: z
    .number()
    .int()
    .min(0, 'Numărul de angajați nu poate fi negativ'),

  capital_social: z
    .number()
    .min(1, 'Capitalul social trebuie să fie cel puțin 1'),

  stare: z
    .enum(['Activa', 'Radiata', 'Suspendata', 'InInsolventa'])
    .optional()
    .default('Activa'),

  wallet: z
    .string()
    .max(100, 'Adresa wallet poate avea maxim 100 de caractere')
    .optional()
    .or(z.literal('')),
});

export type PersoanaJuridicaFormValues = z.infer<typeof persoanaJuridicaSchema>;
