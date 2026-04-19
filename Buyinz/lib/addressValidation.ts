/** US-oriented checks for store street address fields (client-side; no network). */

const MAX_STREET_LEN = 120;
const MAX_CITY_LEN = 80;
const MIN_CITY_LEN = 2;

/** US ZIP: 5 digits, optional hyphen + 4 extension. */
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

/** Two-letter US state / territory code (user input). */
const US_STATE_REGEX = /^[A-Za-z]{2}$/;

/** Normalize to first 5 digits for comparison with geocoder results. */
export function normalizeUsZipToFiveDigits(input: string): string {
  const digits = input.replace(/\D/g, '');
  return digits.length >= 5 ? digits.slice(0, 5) : digits;
}

export function isValidUsZipFormat(input: string): boolean {
  const t = input.trim();
  if (!t) return false;
  return US_ZIP_REGEX.test(t);
}

/** Uppercase 2-letter state/region code. */
export function normalizeUsStateRegion(input: string): string {
  return input.trim().toUpperCase().slice(0, 2);
}

export function isValidUsStateCode(input: string): boolean {
  return US_STATE_REGEX.test(input.trim());
}

export type StoreAddressFieldInput = {
  address_line1: string;
  city: string;
  region: string;
  postal_code: string;
};

/**
 * Validates format before calling geocode. Does not prove deliverability.
 */
export function validateUsStoreAddressFormat(
  parts: StoreAddressFieldInput,
): { ok: true } | { ok: false; message: string } {
  const street = parts.address_line1.trim();
  if (!street) {
    return { ok: false, message: 'Street address is required.' };
  }
  if (street.length > MAX_STREET_LEN) {
    return { ok: false, message: 'Street address is too long.' };
  }

  const city = parts.city.trim();
  if (!city || city.length < MIN_CITY_LEN) {
    return { ok: false, message: 'City is required.' };
  }
  if (city.length > MAX_CITY_LEN) {
    return { ok: false, message: 'City name is too long.' };
  }

  const regionRaw = parts.region.trim();
  if (!regionRaw) {
    return { ok: false, message: 'State or region is required.' };
  }
  if (!isValidUsStateCode(regionRaw)) {
    return {
      ok: false,
      message: 'Use a 2-letter state code (e.g. PA for Pennsylvania).',
    };
  }

  const zip = parts.postal_code.trim();
  if (!isValidUsZipFormat(zip)) {
    return {
      ok: false,
      message: 'Enter a valid U.S. ZIP code (5 digits, optional +4).',
    };
  }

  return { ok: true };
}
