import { insertPost } from '@/supabase/queries';

/** Must match `posts.category` for new listings. */
export const LISTING_CATEGORIES = ['Tops', 'Bottoms', 'Accessories', 'Other'] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export interface ImageAsset {
  uri: string;
  width: number;
  height: number;
}

export interface ListingDraft {
  images: ImageAsset[];
  title: string;
  price: string;
  category: ListingCategory;
}

export const EMPTY_DRAFT: ListingDraft = {
  images: [],
  title: '',
  price: '',
  category: 'Other',
};

export const MAX_PHOTOS = 5;

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

/** A listing is valid as long as it has at least one photo and a title. Price is optional. */
export function isDraftValid(draft: ListingDraft): boolean {
  if (draft.images.length === 0) return false;
  if (draft.title.trim().length === 0) return false;
  const pt = draft.price.trim();
  if (pt.length > 0) {
    const n = parseFloat(pt);
    if (!Number.isFinite(n) || n < 0) return false;
  }
  return true;
}

export async function submitListing(
  draft: ListingDraft,
  userId?: string,
): Promise<{ success: boolean; id: string }> {
  const id = await insertPost(draft, userId);
  return { success: true, id };
}
