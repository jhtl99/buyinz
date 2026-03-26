import type { SalePost } from '@/data/mockData';

export interface ImageAsset {
  uri: string;
  width: number;
  height: number;
}

export interface ListingDraft {
  images: ImageAsset[];
  title: string;
  price: string;
  condition: SalePost['condition'] | null;
  category: SalePost['category'] | null;
  zipCode: string;
  description: string;
  hashtags: string;
}

export const EMPTY_DRAFT: ListingDraft = {
  images: [],
  title: '',
  price: '',
  condition: null,
  category: null,
  zipCode: '',
  description: '',
  hashtags: '',
};

export const CONDITIONS: SalePost['condition'][] = ['New', 'Like New', 'Good', 'Fair'];

export const CATEGORIES: SalePost['category'][] = [
  'Furniture',
  'Clothing',
  'Electronics',
  'Books',
  'Decor',
  'Other',
];

export const MAX_PHOTOS = 5;

export function isDraftValid(draft: ListingDraft): boolean {
  return (
    draft.images.length > 0 &&
    draft.title.trim().length > 0 &&
    draft.price.trim().length > 0 &&
    parseFloat(draft.price) >= 0 &&
    draft.condition !== null &&
    draft.category !== null &&
    /^\d{5}$/.test(draft.zipCode)
  );
}

export function parseHashtags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`));
}

export async function submitListing(
  draft: ListingDraft,
  userId?: string,
): Promise<{ success: boolean; id: string }> {
  const { insertPost } = await import('@/supabase/queries');
  const id = await insertPost(draft, userId);
  return { success: true, id };
}
