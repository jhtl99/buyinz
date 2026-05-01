import { insertPost } from '@/supabase/queries';
import type { ListingDraft } from './listingDraft';
import { getListingPriceValidationError } from './listingDraft';

export type { ImageAsset, ListingDraft } from './listingDraft';
export { priceStringToDbValue, getListingPriceValidationError } from './listingDraft';

export const EMPTY_DRAFT: ListingDraft = {
  images: [],
  title: '',
  price: '',
};

export const MAX_PHOTOS = 5;

/** A listing is valid as long as it has at least one photo. Title and price are optional. */
export function isDraftValid(draft: ListingDraft): boolean {
  if (draft.images.length === 0) return false;
  return getListingPriceValidationError(draft.price) === null;
}

export async function submitListing(
  draft: ListingDraft,
  userId?: string,
): Promise<{ success: boolean; id: string }> {
  const id = await insertPost(draft, userId);
  return { success: true, id };
}
