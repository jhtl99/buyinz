import { supabase } from './client';

export interface ConversationCompletion {
  buyer_marked_complete_at: string | null;
  seller_marked_complete_at: string | null;
}

export async function fetchConversationCompletion(
  conversationId: string,
): Promise<ConversationCompletion> {
  const { data, error } = await supabase
    .from('conversations')
    .select('buyer_marked_complete_at, seller_marked_complete_at')
    .eq('id', conversationId)
    .single();

  if (error) throw error;
  return {
    buyer_marked_complete_at: data.buyer_marked_complete_at ?? null,
    seller_marked_complete_at: data.seller_marked_complete_at ?? null,
  };
}

export async function markMyTransactionComplete(
  conversationId: string,
  role: 'buyer' | 'seller',
): Promise<void> {
  const field = role === 'buyer' ? 'buyer_marked_complete_at' : 'seller_marked_complete_at';
  const { error } = await supabase
    .from('conversations')
    .update({ [field]: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (error) throw error;
}

export async function fetchMyRatingForConversation(
  conversationId: string,
  raterId: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('user_ratings')
    .select('stars')
    .eq('conversation_id', conversationId)
    .eq('rater_id', raterId)
    .maybeSingle();

  if (error) throw error;
  return data?.stars ?? null;
}

export async function submitConversationRating(
  conversationId: string,
  raterId: string,
  rateeId: string,
  stars: number,
): Promise<void> {
  const s = Math.min(5, Math.max(1, Math.round(stars)));
  const { error } = await supabase.from('user_ratings').insert({
    conversation_id: conversationId,
    rater_id: raterId,
    ratee_id: rateeId,
    stars: s,
  });

  if (error) throw error;
}

/**
 * Denormalized stats on `public.users`, maintained by trigger after inserts into `user_ratings`
 * (see supabase/migrations). Source of truth for averages is all rows where `ratee_id` = user.
 */
export type UserRatingStats = {
  averageRating: number;
  ratingCount: number;
};

function isMissingUserRatingColumnsError(error: { message?: string; code?: string }): boolean {
  const m = (error.message ?? '').toLowerCase();
  return (
    error.code === '42703' ||
    m.includes('average_rating') ||
    m.includes('rating_count') ||
    (m.includes('column') && m.includes('does not exist'))
  );
}

export async function fetchUserRatingStats(userId: string): Promise<UserRatingStats | null> {
  const { data, error } = await supabase
    .from('users')
    .select('average_rating, rating_count')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (!isMissingUserRatingColumnsError(error)) {
      console.warn('[fetchUserRatingStats]', error.message);
    }
    return null;
  }
  if (!data) return null;

  const ratingCount =
    typeof data.rating_count === 'number'
      ? data.rating_count
      : parseInt(String(data.rating_count ?? 0), 10) || 0;
  const averageRating =
    data.average_rating != null ? Number(data.average_rating) : 0;

  return { averageRating, ratingCount };
}
