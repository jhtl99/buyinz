import { supabase } from '@/supabase/client';

export type OfferStatus = 'pending' | 'accepted' | 'declined';

export interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: OfferStatus;
  created_at: string;
}

export async function submitOffer(
  listingId: string,
  buyerId: string,
  sellerId: string,
  amount: number,
  originalPrice: number
): Promise<{ success: boolean; error?: string }> {
  // 1. Validation rule: cannot exceed original asking price (unless bidding)
  if (amount > originalPrice) {
    return { success: false, error: 'Offer cannot exceed original asking price.' };
  }

  // 2. State machine logic: Check for pending offers from this buyer on this listing
  const { data: existingOffers, error: fetchError } = await supabase
    .from('offers')
    .select('*')
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .eq('status', 'pending');

  if (fetchError) {
    // If the table doesn't exist yet, we'll gracefully handle it and just log for now so the UI doesn't crash completely.
    console.warn("Offers table might not exist yet:", fetchError);
  } else if (existingOffers && existingOffers.length > 0) {
    return { success: false, error: 'You already have a pending offer for this item.' };
  }

  // 3. Write record to Offers table
  const { error: insertError } = await supabase.from('offers').insert({
    listing_id: listingId,
    buyer_id: buyerId,
    seller_id: sellerId,
    amount,
    status: 'pending',
  });

  if (insertError) {
    console.error("Error submitting offer:", insertError);
    return { success: false, error: 'Failed to submit offer to database.' };
  }

  // Note: in a fully connected system, this would trigger an edge function or DB trigger for the notification.
  // For the frontend simulation, we rely on the realtime subscriptions or direct notifications logic.

  return { success: true };
}
