/**
 * Application Constants
 * Common values used across the application
 */

import { CountryCode } from './models/common.models';

/**
 * Default values for forms and requests
 */
export const DEFAULTS = {
  COUNTRY_CODE: CountryCode.RO,
  TAX_YEAR: new Date().getFullYear(),
  CURRENCY: 'RON',
  VAT_RATE: 0.19, // 19% VAT in Romania
  LANGUAGE: 'ro',
} as const;

/**
 * API endpoint paths (relative to base URL)
 */
export const API_ENDPOINTS = {
  INVOICE: {
    BASE: '/invoices',
    HEALTH: '/invoices/health',
    VALIDATE: (id: string) => `/invoices/${id}/validate`,
  },
  TAX_CALCULATION: {
    BASE: '/calculate',
    HEALTH: '/calculate/health',
    RATES: '/calculate/rates',
    RATES_BY_COUNTRY: (country: string) => `/calculate/rates/${country}`,
  },
  BUSINESS_ENTITY: {
    BASE: '/entities',
    HEALTH: '/entities/health',
    VALIDATE: '/entities/validate',
    VALIDATE_BY_ID: (id: string) => `/entities/${id}/validate`,
  },
  ZK_PROOF: {
    BASE: '/proof',
    HEALTH: '/proof/health',
    GENERATE: '/proof/generate',
    VERIFY: '/proof/verify',
  },
  VALIDATION: {
    BASE: '/validate',
    HEALTH: '/validate/health',
    INVOICE: '/validate/invoice',
    ENTITY: '/validate/entity',
    TAX: '/validate/tax',
    COMPREHENSIVE: '/validate/comprehensive',
  },
} as const;

/**
 * Romanian business entity types
 */
export const BUSINESS_ENTITY_TYPES = {
  SRL: 'Societate cu Răspundere Limitată',
  SA: 'Societate pe Acțiuni',
  PFA: 'Persoană Fizică Autorizată',
  II: 'Întreprindere Individuală',
  Individual: 'Persoană Fizică',
} as const;

/**
 * Invoice types
 */
export const INVOICE_TYPES = {
  Income: 'Venit',
  Expense: 'Cheltuială',
} as const;

/**
 * Validation messages
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Acest câmp este obligatoriu',
  INVALID_CUI: 'CUI invalid',
  INVALID_EMAIL: 'Email invalid',
  INVALID_PHONE: 'Număr de telefon invalid',
  INVALID_DATE: 'Dată invalidă',
  INVALID_AMOUNT: 'Sumă invalidă',
  MIN_LENGTH: (min: number) => `Minim ${min} caractere`,
  MAX_LENGTH: (max: number) => `Maxim ${max} caractere`,
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Eroare de conexiune. Verificați conexiunea la internet.',
  SERVER_ERROR: 'Eroare de server. Încercați din nou mai târziu.',
  NOT_FOUND: 'Resursa nu a fost găsită.',
  UNAUTHORIZED: 'Nu sunteți autorizat. Vă rugăm să vă autentificați.',
  FORBIDDEN: 'Nu aveți permisiunea să accesați această resursă.',
  VALIDATION_ERROR: 'Datele introduse nu sunt valide.',
  UNKNOWN_ERROR: 'A apărut o eroare. Vă rugăm să încercați din nou.',
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  INVOICE_CREATED: 'Factura a fost creată cu succes',
  INVOICE_UPDATED: 'Factura a fost actualizată cu succes',
  INVOICE_DELETED: 'Factura a fost ștearsă cu succes',
  ENTITY_CREATED: 'Entitatea a fost creată cu succes',
  ENTITY_UPDATED: 'Entitatea a fost actualizată cu succes',
  ENTITY_DELETED: 'Entitatea a fost ștearsă cu succes',
  TAX_CALCULATED: 'Calculul taxelor a fost efectuat cu succes',
  PROOF_GENERATED: 'Dovada ZK a fost generată cu succes',
  PROOF_VERIFIED: 'Dovada ZK a fost verificată cu succes',
  VALIDATION_SUCCESS: 'Validarea a fost efectuată cu succes',
} as const;

/**
 * Loading messages
 */
export const LOADING_MESSAGES = {
  LOADING: 'Se încarcă...',
  CREATING: 'Se creează...',
  UPDATING: 'Se actualizează...',
  DELETING: 'Se șterge...',
  CALCULATING: 'Se calculează...',
  VALIDATING: 'Se validează...',
  GENERATING_PROOF: 'Se generează dovada...',
  VERIFYING_PROOF: 'Se verifică dovada...',
} as const;

/**
 * Date formats
 */
export const DATE_FORMATS = {
  DISPLAY: 'dd.MM.yyyy',
  DISPLAY_WITH_TIME: 'dd.MM.yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
  ISO_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss",
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * HTTP timeouts (milliseconds)
 */
export const TIMEOUTS = {
  DEFAULT: 30000, // 30 seconds
  LONG_OPERATION: 60000, // 1 minute
  SHORT_OPERATION: 10000, // 10 seconds
} as const;

/**
 * Romanian county codes (for addresses)
 */
export const ROMANIAN_COUNTIES = [
  { code: 'AB', name: 'Alba' },
  { code: 'AR', name: 'Arad' },
  { code: 'AG', name: 'Argeș' },
  { code: 'BC', name: 'Bacău' },
  { code: 'BH', name: 'Bihor' },
  { code: 'BN', name: 'Bistrița-Năsăud' },
  { code: 'BT', name: 'Botoșani' },
  { code: 'BR', name: 'Brăila' },
  { code: 'BV', name: 'Brașov' },
  { code: 'B', name: 'București' },
  { code: 'BZ', name: 'Buzău' },
  { code: 'CL', name: 'Călărași' },
  { code: 'CS', name: 'Caraș-Severin' },
  { code: 'CJ', name: 'Cluj' },
  { code: 'CT', name: 'Constanța' },
  { code: 'CV', name: 'Covasna' },
  { code: 'DB', name: 'Dâmbovița' },
  { code: 'DJ', name: 'Dolj' },
  { code: 'GL', name: 'Galați' },
  { code: 'GR', name: 'Giurgiu' },
  { code: 'GJ', name: 'Gorj' },
  { code: 'HR', name: 'Harghita' },
  { code: 'HD', name: 'Hunedoara' },
  { code: 'IL', name: 'Ialomița' },
  { code: 'IS', name: 'Iași' },
  { code: 'IF', name: 'Ilfov' },
  { code: 'MM', name: 'Maramureș' },
  { code: 'MH', name: 'Mehedinți' },
  { code: 'MS', name: 'Mureș' },
  { code: 'NT', name: 'Neamț' },
  { code: 'OT', name: 'Olt' },
  { code: 'PH', name: 'Prahova' },
  { code: 'SJ', name: 'Sălaj' },
  { code: 'SM', name: 'Satu Mare' },
  { code: 'SB', name: 'Sibiu' },
  { code: 'SV', name: 'Suceava' },
  { code: 'TR', name: 'Teleorman' },
  { code: 'TM', name: 'Timiș' },
  { code: 'TL', name: 'Tulcea' },
  { code: 'VL', name: 'Vâlcea' },
  { code: 'VS', name: 'Vaslui' },
  { code: 'VN', name: 'Vrancea' },
] as const;

/**
 * Tax rates for Romania (2025)
 */
export const ROMANIA_TAX_RATES = {
  VAT: {
    STANDARD: 0.19, // 19%
    REDUCED: 0.09, // 9%
    SUPER_REDUCED: 0.05, // 5%
  },
  INCOME_TAX: {
    STANDARD: 0.1, // 10%
  },
  SOCIAL_SECURITY: {
    CAS: 0.25, // 25%
    CASS: 0.1, // 10%
  },
} as const;

/**
 * Regular expressions for validation
 */
export const REGEX = {
  CUI: /^RO\d{2,10}$/, // Romanian CUI format
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_RO: /^(\+40|0)[0-9]{9}$/,
  IBAN_RO: /^RO\d{2}[A-Z]{4}\d{16}$/,
} as const;
