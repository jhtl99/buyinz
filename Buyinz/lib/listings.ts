import { insertPost } from '@/supabase/queries';

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

export const EMPTY_DRAFT: ListingDraft = {
  images: [],
  title: '',
  price: '',
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
