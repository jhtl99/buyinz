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
