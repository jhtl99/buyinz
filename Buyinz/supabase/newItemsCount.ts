import { supabase } from './client';

type RpcRow = { store_user_id: string; new_count: number | string };

/**
 * Counts active (not sold) sale posts per store in the last rolling 24 hours (server RPC).
 * Missing stores get 0.
 */
export async function fetchNewSaleListingsCountLast24hBatch(
  storeUserIds: string[],
): Promise<Record<string, number>> {
  const unique = [...new Set(storeUserIds)].filter(Boolean);
  const out: Record<string, number> = {};
  for (const id of unique) {
    out[id] = 0;
  }
  if (unique.length === 0) return out;

  const { data, error } = await supabase.rpc('new_sale_listings_count_last_24h_by_stores', {
    p_store_user_ids: unique,
  });

  if (error) throw error;

  for (const row of (data ?? []) as RpcRow[]) {
    out[row.store_user_id] = Number(row.new_count);
  }
  return out;
}
