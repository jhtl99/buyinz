/** Shared listing draft types + price parsing — imported by `lib/listings` and `supabase/postsInsert` without a barrel cycle. */

export const LISTING_PRICE_MIN = 0;
export const LISTING_PRICE_MAX = 10_000;
const LISTING_PRICE_REGEX = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const LISTING_PRICE_MAX_LABEL = '10,000';

export interface ImageAsset {
  uri: string;
  width: number;
  height: number;
}

export interface ListingDraft {
  images: ImageAsset[];
  title: string;
  price: string;
}

export function getListingPriceValidationError(price: string): string | null {
  const t = price.trim();
  if (t.length === 0) return null;
  if (!LISTING_PRICE_REGEX.test(t)) {
    return 'Enter a valid price with up to 2 decimal places.';
  }

  const n = Number(t);
  if (!Number.isFinite(n)) {
    return 'Enter a valid price.';
  }
  if (n < LISTING_PRICE_MIN) {
    return `Price must be at least $${LISTING_PRICE_MIN}.`;
  }
  if (n > LISTING_PRICE_MAX) {
    return `Price must be $${LISTING_PRICE_MAX_LABEL} or less.`;
  }

  return null;
}

export function validateListingPrice(price: string): void {
  const message = getListingPriceValidationError(price);
  if (message) {
    throw new Error(message);
  }
}

/**
 * Maps draft price field to DB: empty → null (no price), valid number including 0 → stored as-is.
 * Non-numeric input when non-empty is invalid for submit (see validateListingPrice).
 */
export function priceStringToDbValue(price: string): number | null {
  const t = price.trim();
  if (t.length === 0) return null;
  if (getListingPriceValidationError(t)) return null;
  return Number(t);
}
