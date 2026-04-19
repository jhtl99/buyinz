import { insertPost } from '@/supabase/queries';

/** Must match `posts.category` and Explore shelf filters (excluding All). */
export const LISTING_CATEGORIES = [
  'Furniture',
  'Clothing',
  'Electronics',
  'Books',
  'Decor',
  'Other',
] as const;

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

/** Parses listing price string; non-numeric or empty yields 0 (matches insert behavior). */
export function parsePriceToNumber(price: string): number {
  const n = parseFloat(price);
  return Number.isFinite(n) ? n : 0;
}

/** A listing is valid as long as it has at least one photo and a title. Price is optional. */
export function isDraftValid(draft: ListingDraft): boolean {
  if (draft.images.length === 0) return false;
  if (draft.title.trim().length === 0) return false;
  if (draft.price.trim().length > 0 && parsePriceToNumber(draft.price) < 0) return false;
  return true;
}

export async function submitListing(
  draft: ListingDraft,
  userId?: string,
): Promise<{ success: boolean; id: string }> {
  const id = await insertPost(draft, userId);
  return { success: true, id };
}
