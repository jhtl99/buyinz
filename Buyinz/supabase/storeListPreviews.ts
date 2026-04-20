import { supabase } from './client';

export type StoreListingPreviewRow = {
  store_user_id: string;
  preview_urls: string[] | null;
  total_sale_listings: number | string;
};

/**
 * First-image URLs from the newest non-sold sale listings per store (up to `perStore`), plus total active sale count.
 */
export async function fetchStoreSaleListingPreviewsBatch(
  storeUserIds: string[],
  perStore = 3,
): Promise<Record<string, { previewUrls: string[]; totalSaleListings: number }>> {
  const unique = [...new Set(storeUserIds)].filter(Boolean);
  const out: Record<string, { previewUrls: string[]; totalSaleListings: number }> = {};
  for (const id of unique) {
    out[id] = { previewUrls: [], totalSaleListings: 0 };
  }
  if (unique.length === 0) return out;

  const { data, error } = await supabase.rpc('store_sale_listing_preview_urls', {
    p_store_user_ids: unique,
    p_per_store: perStore,
  });

  if (error) throw error;

  for (const row of (data ?? []) as StoreListingPreviewRow[]) {
    const id = row.store_user_id;
    const urls = Array.isArray(row.preview_urls) ? row.preview_urls.filter(Boolean) : [];
    out[id] = {
      previewUrls: urls,
      totalSaleListings: Number(row.total_sale_listings ?? 0),
    };
  }
  return out;
}
