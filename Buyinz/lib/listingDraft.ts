/** Shared listing draft types + price parsing — imported by `lib/listings` and `supabase/postsInsert` without a barrel cycle. */

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

/**
 * Maps draft price field to DB: empty → null (no price), valid number including 0 → stored as-is.
 * Non-numeric input when non-empty is invalid for submit (see isDraftValid).
 */
export function priceStringToDbValue(price: string): number | null {
  const t = price.trim();
  if (t.length === 0) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}
