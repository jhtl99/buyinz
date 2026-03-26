/** Mock Buyinz Pro checkout — format checks only, no real payment. */

export const CARD_DIGITS_LEN = 16;
export const CVV_LEN_MIN = 3;
export const CVV_LEN_MAX = 4;
export const EXPIRY_LEN = 5; // MM/YY

export function cardDigitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Card number: exactly 16 digits (common Visa/MC mock). */
export function isValidCardNumber(raw: string): boolean {
  const d = cardDigitsOnly(raw);
  return d.length === CARD_DIGITS_LEN;
}

/** CVV: 3 or 4 digits. */
export function isValidCvv(raw: string): boolean {
  const d = cardDigitsOnly(raw);
  return d.length >= CVV_LEN_MIN && d.length <= CVV_LEN_MAX;
}

/**
 * Expiry: exactly 5 characters as MM/YY, month 01–12.
 * Slash required in position 3 (e.g. `08/27`).
 */
export function isValidExpiry(raw: string): boolean {
  if (raw.length !== EXPIRY_LEN) return false;
  if (raw[2] !== '/') return false;
  const mm = raw.slice(0, 2);
  const yy = raw.slice(3, 5);
  if (!/^\d{2}$/.test(mm) || !/^\d{2}$/.test(yy)) return false;
  const month = parseInt(mm, 10);
  if (month < 1 || month > 12) return false;
  return true;
}
