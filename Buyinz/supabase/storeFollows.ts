import { supabase } from './client';
import { fetchNewSaleListingsCountLast24hBatch } from './newItemsCount';
import { fetchStoreSaleListingPreviewsBatch } from './storeListPreviews';

export type FollowedStoreForHome = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  newItemsLast24h: number;
  latitude: number | null;
  longitude: number | null;
  previewUrls: string[];
  totalSaleListings: number;
};

type FollowerCountRow = { store_id: string; follower_count: number | string };

/**
 * Followed stores for the signed-in shopper, with 24h new listing counts.
 */
export async function fetchFollowedStoresForHome(): Promise<FollowedStoreForHome[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return [];

  const { data: follows, error } = await supabase
    .from('store_follows')
    .select('store_id')
    .eq('follower_id', user.id);

  if (error) throw error;
  const ids = [...new Set((follows ?? []).map((r) => r.store_id as string))];
  if (ids.length === 0) return [];

  const { data: stores, error: storeErr } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, latitude, longitude')
    .in('id', ids)
    .eq('account_type', 'store');

  if (storeErr) throw storeErr;

  const newCounts = await fetchNewSaleListingsCountLast24hBatch(ids);
  const previews = await fetchStoreSaleListingPreviewsBatch(ids, 3);
  const list = (stores ?? []) as Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    latitude: number | null;
    longitude: number | null;
  }>;

  return list
    .map((u) => {
      const pv = previews[u.id] ?? { previewUrls: [], totalSaleListings: 0 };
      const lat = u.latitude;
      const lng = u.longitude;
      return {
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        newItemsLast24h: newCounts[u.id] ?? 0,
        latitude: typeof lat === 'number' && Number.isFinite(lat) ? lat : null,
        longitude: typeof lng === 'number' && Number.isFinite(lng) ? lng : null,
        previewUrls: pv.previewUrls,
        totalSaleListings: pv.totalSaleListings,
      };
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
}

export async function followStore(storeId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not signed in');

  const { error } = await supabase.from('store_follows').insert({
    follower_id: user.id,
    store_id: storeId,
  });
  if (error) throw error;
}

export async function unfollowStore(storeId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not signed in');

  const { error } = await supabase
    .from('store_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('store_id', storeId);
  if (error) throw error;
}

export async function isFollowingStore(storeId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return false;

  const { data, error } = await supabase
    .from('store_follows')
    .select('store_id')
    .eq('follower_id', user.id)
    .eq('store_id', storeId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

/**
 * Follower counts per store id; stores with zero followers are omitted (caller should default to 0).
 */
export async function fetchStoreFollowerCountsBatch(
  storeIds: string[],
): Promise<Record<string, number>> {
  const unique = [...new Set(storeIds)].filter(Boolean);
  const out: Record<string, number> = {};
  for (const id of unique) out[id] = 0;
  if (unique.length === 0) return out;

  const { data, error } = await supabase.rpc('store_follower_counts', {
    p_store_ids: unique,
  });

  if (error) throw error;

  for (const row of (data ?? []) as FollowerCountRow[]) {
    out[row.store_id] = Number(row.follower_count);
  }
  return out;
}
