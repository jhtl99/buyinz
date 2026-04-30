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

/** Strip invalid ZIP characters while preserving digits and a single hyphen. */
export function sanitizeUsZipInput(input: string): string {
  return input.replace(/[^\d-]/g, '').slice(0, 10);
}

export function isValidUsZipFormat(input: string): boolean {
  const t = input.trim();
  if (!t) return false;
  return US_ZIP_REGEX.test(t);
}

export function getPittsburghZipValidationError(
  input: string,
): string | null {
  const t = input.trim();
  if (!isValidUsZipFormat(t)) {
    return 'Enter a valid U.S. ZIP code (5 digits, optional +4).';
  }

  const zip5 = normalizeUsZipToFiveDigits(t);
  if (!zip5.startsWith('152')) {
    return 'Use a Pittsburgh ZIP code.';
  }

  return null;
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
  const zipError = getPittsburghZipValidationError(zip);
  if (zipError) {
    return {
      ok: false,
      message: zipError,
    };
  }

  return { ok: true };
}
