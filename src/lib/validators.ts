/**
 * Input sanitization & validation utilities.
 * Security audit: centralised sanitisers used by every text input in the app.
 */

// ── Max-length constants ────────────────────────────────────────────────────
export const MAX_NAME = 50;
export const MAX_EMAIL = 254;
export const MAX_PASSWORD = 128;
export const MAX_SEARCH = 100;
export const MAX_SHORT_TEXT = 100; // goals, locations, etc.
export const MAX_MEDIUM_TEXT = 200; // medical conditions, dislikes, injury text
export const MAX_LONG_TEXT = 500; // descriptions, notes, feedback, chat
export const MAX_TITLE = 50;
export const MAX_NUMERIC_INT = 6; // digits for integer fields
export const MAX_NUMERIC_DEC = 8; // digits + decimal for weight fields

// ── Sanitisers ──────────────────────────────────────────────────────────────

/** Name fields: letters (unicode), spaces, hyphens, apostrophes only. */
// Security: strips <>"';& and other dangerous chars from name input
export function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '').slice(0, MAX_NAME);
}

/** Email fields: standard email characters only (RFC 5321 subset). */
// Security: strips dangerous chars, keeps only valid email characters
export function sanitizeEmail(value: string): string {
  return value.replace(/[^a-zA-Z0-9@._+\-]/g, '').slice(0, MAX_EMAIL);
}

/** Integer numeric fields: digits only (sets, reps, rest seconds, etc.). */
// Security: prevents script injection via numeric inputs
export function sanitizeNumericInt(value: string, maxLen = MAX_NUMERIC_INT): string {
  return value.replace(/[^0-9]/g, '').slice(0, maxLen);
}

/** Decimal numeric fields: digits and a single decimal point (weight). */
// Security: prevents injection via decimal inputs
export function sanitizeNumericDecimal(value: string, maxLen = MAX_NUMERIC_DEC): string {
  let cleaned = value.replace(/[^0-9.]/g, '');
  // Allow only one decimal point
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex !== -1) {
    cleaned = cleaned.slice(0, dotIndex + 1) + cleaned.slice(dotIndex + 1).replace(/\./g, '');
  }
  return cleaned.slice(0, maxLen);
}

/** General text fields: strips dangerous characters < > " ' ; & \ / */
// Security: removes characters commonly used in XSS / injection attacks
export function sanitizeGeneralText(value: string, maxLen: number): string {
  return value.replace(/[<>"';\\\/&]/g, '').slice(0, maxLen);
}

/** Search fields: same as general text with MAX_SEARCH limit. */
// Security: sanitises search queries before API calls
export function sanitizeSearch(value: string): string {
  return sanitizeGeneralText(value, MAX_SEARCH);
}
