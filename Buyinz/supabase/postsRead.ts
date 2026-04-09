import type { Post, SalePost } from '@/data/mockData';
import { formatBoostRpcError } from '@/lib/boostErrors';
import { supabase } from './client';
import { mapRowToPost, sortRowsForHomeFeed } from './postMappers';
import { getFollowingUserIds } from './socialQueries';
import { isMissingSocialTable } from './socialTable';

export async function fetchFeedPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, users(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRowToPost);
}

/**
 * Home Friends+ feed: posts from followed users only; optional second degree (follows of follows).
 * Excludes the current user's own posts. Chronological by created_at desc.
 */
export async function fetchFriendsFeedPosts(
  currentUserId: string,
  options: { includeSecondDegree: boolean },
): Promise<Post[]> {
  if (!currentUserId) return [];

  const firstDegreeIds = await getFollowingUserIds(currentUserId);
  const allowedUserIds = new Set<string>(firstDegreeIds);

  if (options.includeSecondDegree && firstDegreeIds.length > 0) {
    const { data: secondRows, error: secondError } = await supabase
      .from('social_connections')
      .select('addressee_id')
      .in('requester_id', firstDegreeIds)
      .eq('status', 'accepted');

    if (secondError && !isMissingSocialTable(secondError)) throw secondError;

    for (const row of secondRows ?? []) {
      allowedUserIds.add(row.addressee_id);
    }
  }

  allowedUserIds.delete(currentUserId);

  const ids = [...allowedUserIds];
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('posts')
    .select('*, users(*)')
    .in('user_id', ids)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return sortRowsForHomeFeed(data ?? []).map(mapRowToPost);
}

/**
 * Current user's sale listings (profile grid). Newest first.
 */
export async function fetchUserSaleListings(userId: string): Promise<SalePost[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('posts')
    .select('*, users(*)')
    .eq('user_id', userId)
    .eq('type', 'sale')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapRowToPost(row) as SalePost);
}

/** Single sale listing for detail screen (DB). */
export async function fetchSaleListingById(id: string): Promise<SalePost | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, users(*)')
    .eq('id', id)
    .eq('type', 'sale')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRowToPost(data) as SalePost;
}

export async function applyListingBoost(listingId: string): Promise<void> {
  const { error } = await supabase.rpc('apply_listing_boost', { p_listing_id: listingId });
  if (error) throw new Error(formatBoostRpcError(error));
}

/** Deletes the listing and related conversations/messages; server enforces seller ownership. */
export async function deleteOwnSaleListing(listingId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_own_sale_listing', {
    p_listing_id: listingId,
  });
  if (error) throw new Error(error.message);
}
