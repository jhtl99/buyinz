import { milesBetween, type GeoPoint } from '@/lib/discoveryLocation';
import { sanitizePublicAvatarUrl } from '@/lib/avatar';

import { supabase } from './client';
import { fetchNewSaleListingsCountLast24hBatch } from './newItemsCount';
import { fetchStoreSaleListingPreviewsBatch } from './storeListPreviews';

export type NearbyStoreForExplore = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  newItemsLast24h: number;
  previewUrls: string[];
  totalSaleListings: number;
};

/**
 * Store accounts with geocoordinates, filtered by radius from userCoords, sorted by distance.
 * Excludes stores the signed-in user already follows (Discover = not yet followed).
 * Includes new-item counts for the last 24h per store.
 */
export async function fetchNearbyStoresForExplore(options: {
  userCoords: GeoPoint;
  radiusMiles: number;
}): Promise<NearbyStoreForExplore[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let followedStoreIds = new Set<string>();
  if (user?.id) {
    const { data: follows, error: followErr } = await supabase
      .from('store_follows')
      .select('store_id')
      .eq('follower_id', user.id);

    if (followErr) throw followErr;
    followedStoreIds = new Set((follows ?? []).map((r) => r.store_id as string));
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, latitude, longitude')
    .eq('account_type', 'store')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) throw error;

  const rows = data ?? [];
  const enriched = rows
    .map((row) => {
      const lat = row.latitude as number;
      const lng = row.longitude as number;
      const distanceMiles = milesBetween(options.userCoords, { latitude: lat, longitude: lng });
      return {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        avatar_url: sanitizePublicAvatarUrl(row.avatar_url),
        latitude: lat,
        longitude: lng,
        distanceMiles,
      };
    })
    .filter((r) => r.distanceMiles <= options.radiusMiles)
    .filter((r) => !followedStoreIds.has(r.id))
    .sort((a, b) => a.distanceMiles - b.distanceMiles);

  const ids = enriched.map((r) => r.id);
  const counts = await fetchNewSaleListingsCountLast24hBatch(ids);
  const previews = await fetchStoreSaleListingPreviewsBatch(ids, 3);

  return enriched.map((r) => {
    const pv = previews[r.id] ?? { previewUrls: [], totalSaleListings: 0 };
    return {
      ...r,
      newItemsLast24h: counts[r.id] ?? 0,
      previewUrls: pv.previewUrls,
      totalSaleListings: pv.totalSaleListings,
    };
  });
}
