import type { Post, SalePost } from '@/data/mockData';
import { supabase } from './client';
import { mapRowToPost } from './postMappers';

export async function fetchFeedPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, users(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRowToPost);
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

/** Deletes the listing and related conversations; server enforces seller ownership. */
export async function deleteOwnSaleListing(listingId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_own_sale_listing', {
    p_listing_id: listingId,
  });
  if (error) throw new Error(error.message);
}
