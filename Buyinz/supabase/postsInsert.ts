import { supabase } from './client';
import type { ListingDraft, ImageAsset } from '@/lib/listingDraft';
import { priceStringToDbValue, validateListingPrice } from '@/lib/listingDraft';

const DEFAULT_MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';
const IMAGE_BUCKET = 'listing-images';

export function extensionFromUri(uri: string): string {
  return uri.split('.').pop()?.toLowerCase() ?? 'jpg';
}

export function buildListingImageStoragePath(ext: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export function contentTypeForImageExtension(ext: string): string {
  return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
}

export async function uploadArrayBufferToListingImages(
  path: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, body, { contentType });
  if (error) throw error;
}

export function publicUrlForListingImagePath(path: string): string {
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadListingImages(images: ImageAsset[]): Promise<string[]> {
  const urls: string[] = [];

  for (const img of images) {
    const ext = extensionFromUri(img.uri);
    const path = buildListingImageStoragePath(ext);
    const contentType = contentTypeForImageExtension(ext);

    const response = await fetch(img.uri);
    const arraybuffer = await response.arrayBuffer();

    await uploadArrayBufferToListingImages(path, arraybuffer, contentType);

    urls.push(publicUrlForListingImagePath(path));
  }

  return urls;
}

export async function insertPost(draft: ListingDraft, userId?: string): Promise<string> {
  validateListingPrice(draft.price);
  const imageUrls = await uploadListingImages(draft.images);

  const titleTrimmed = draft.title.trim();
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId || DEFAULT_MOCK_USER_ID,
      type: 'sale',
      title: titleTrimmed.length > 0 ? titleTrimmed : null,
      description: null,
      price: priceStringToDbValue(draft.price),
      images: imageUrls,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}
