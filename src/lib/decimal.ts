/** Weights are stored as numeric(5,2) on the backend: at most 2 decimals. */
export const WEIGHT_DECIMALS = 2;

/**
 * Cleans what's typed into a number box: digits and one dot (a comma counts
 * as the dot), at most `decimals` after it, at most `intDigits` before it.
 * "72.456" → "72.45", "7.2.3" → "7.23", "72,5" → "72.5".
 */
export function limitDecimals(text: string, decimals = WEIGHT_DECIMALS, intDigits = 3): string {
  const cleaned = text.replace(',', '.').replace(/[^0-9.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot === -1) return cleaned.slice(0, intDigits);
  const whole = cleaned.slice(0, dot).slice(0, intDigits);
  const frac = cleaned.slice(dot + 1).replace(/\./g, '').slice(0, decimals);
  return decimals > 0 ? `${whole}.${frac}` : whole;
}

/** Rounds to 2 decimals and drops trailing zeros: 72.456 → "72.46", 72.5 → "72.5", 72 → "72". */
export function fmtWeight(n: number): string {
  return String(Math.round(n * 100) / 100);
}
