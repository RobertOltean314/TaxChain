/**
 * Utility Functions
 * Common helper functions used across the application
 */

import { CountryCode } from './models/common.models';

/**
 * Format date to Romanian format
 */
export function formatDateRO(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format datetime to Romanian format
 */
export function formatDateTimeRO(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ro-RO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format currency (Romanian Lei)
 */
export function formatCurrency(
  amount: number,
  currency: string = 'RON'
): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Validate Romanian CUI (Cod Unic de Înregistrare)
 */
export function validateCUI(cui: string): boolean {
  // Remove 'RO' prefix if present
  const cleanCUI = cui.replace(/^RO/i, '').trim();

  // Check if it's a number between 2 and 10 digits
  if (!/^\d{2,10}$/.test(cleanCUI)) {
    return false;
  }

  // CUI validation algorithm
  const controlKey = '753217532';
  const cuiDigits = cleanCUI.split('').map(Number);
  const checkDigit = cuiDigits.pop()!;

  let sum = 0;
  for (let i = 0; i < cuiDigits.length; i++) {
    sum +=
      cuiDigits[i] *
      parseInt(controlKey[controlKey.length - cuiDigits.length + i]);
  }

  const calculatedCheck = (sum * 10) % 11;
  const finalCheck = calculatedCheck === 10 ? 0 : calculatedCheck;

  return finalCheck === checkDigit;
}

/**
 * Format CUI with RO prefix
 */
export function formatCUI(cui: string): string {
  const cleanCUI = cui.replace(/^RO/i, '').trim();
  return `RO${cleanCUI}`;
}

/**
 * Validate Romanian IBAN
 */
export function validateIBAN(iban: string): boolean {
  const ibanRegex = /^RO\d{2}[A-Z]{4}\d{16}$/;
  return ibanRegex.test(iban.replace(/\s/g, ''));
}

/**
 * Format IBAN with spaces for readability
 */
export function formatIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, '');
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Romanian phone number
 */
export function validatePhoneRO(phone: string): boolean {
  const phoneRegex = /^(\+40|0)[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Format Romanian phone number
 */
export function formatPhoneRO(phone: string): string {
  const clean = phone.replace(/\s/g, '');
  if (clean.startsWith('+40')) {
    return `+40 ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`;
  } else if (clean.startsWith('0')) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return phone;
}

/**
 * Calculate VAT amount
 */
export function calculateVAT(amount: number, vatRate: number = 0.19): number {
  return amount * vatRate;
}

/**
 * Calculate amount with VAT
 */
export function addVAT(amount: number, vatRate: number = 0.19): number {
  return amount * (1 + vatRate);
}

/**
 * Calculate amount without VAT (reverse VAT)
 */
export function removeVAT(
  amountWithVAT: number,
  vatRate: number = 0.19
): number {
  return amountWithVAT / (1 + vatRate);
}

/**
 * Round to 2 decimal places (for currency)
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: any): boolean {
  if (obj == null) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * Get error message from error object
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error?.message) return error.error.message;
  if (error?.error) return String(error.error);
  return 'A apărut o eroare necunoscută';
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert string to title case
 */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substr(0, maxLength - 3) + '...';
}

/**
 * Download file from blob
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Parse ISO date string to Date object
 */
export function parseISODate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Convert Date to ISO string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get country name from country code
 */
export function getCountryName(code: CountryCode): string {
  const countryNames: Record<string, string> = {
    RO: 'România',
    US: 'Statele Unite',
    UK: 'Regatul Unit',
    DE: 'Germania',
    FR: 'Franța',
    IT: 'Italia',
    ES: 'Spania',
    // Add more as needed
  };
  return countryNames[code] || code;
}

/**
 * Sort array by property
 */
export function sortBy<T>(
  array: T[],
  property: keyof T,
  ascending: boolean = true
): T[] {
  return [...array].sort((a, b) => {
    const aValue = a[property];
    const bValue = b[property];

    if (aValue < bValue) return ascending ? -1 : 1;
    if (aValue > bValue) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * Group array by property
 */
export function groupBy<T>(array: T[], property: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const key = String(item[property]);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Calculate tax breakdown for Romania
 */
export function calculateRomanianTaxes(income: number) {
  return {
    income: income,
    incomeTax: income * 0.1, // 10% income tax
    cas: income * 0.25, // 25% CAS (social security)
    cass: income * 0.1, // 10% CASS (health insurance)
    totalTaxes: income * 0.45, // Total 45%
    netIncome: income * 0.55, // Net after taxes
  };
}

/**
 * Check if date is in the past
 */
export function isDateInPast(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
}

/**
 * Check if date is in the future
 */
export function isDateInFuture(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d > new Date();
}

/**
 * Get tax year from date
 */
export function getTaxYear(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getFullYear();
}

/**
 * Sanitize HTML (basic XSS prevention)
 */
export function sanitizeHTML(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}
