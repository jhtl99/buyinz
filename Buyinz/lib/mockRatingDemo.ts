import type { SalePost } from '@/data/mockData';
import { MOCK_FEED_POSTS, MOCK_SELLERS } from '@/data/mockData';
import type { ConversationRow, MessageRow } from '@/supabase/queries';

/*
 * Inbox / profile helpers for a fully local rating-thread experience (no Supabase rows).
 * Intended for QA and screenshots; replace with real `users` + `conversations` when wired.
 */

/** Merges with scripted thread messages in chat UI (not a DB conversation id). */
export const LOCAL_DEMO_CONVERSATION_ID = '00000000-0000-0000-0000-0000000000demo';

/** Inbox row id — opening this row should pass `mockDemo=1` into chat. */
export const SYNTHETIC_RATING_CONVERSATION_ID = '__buyinz_synthetic_rating_conversation__';

/** Feed seller standing in for the synthetic buying thread. */
export const MOCK_RATING_DEMO_PEER = MOCK_SELLERS[1];

/** Listing used for the synthetic buying thread (prefers a post from `MOCK_RATING_DEMO_PEER`). */
export function getMockRatingDemoPost(): SalePost {
  const fromPeer = MOCK_FEED_POSTS.find(
    (p): p is SalePost => p.type === 'sale' && p.seller.id === MOCK_RATING_DEMO_PEER.id,
  );
  if (fromPeer) return fromPeer;
  const firstSale = MOCK_FEED_POSTS.find((p): p is SalePost => p.type === 'sale');
  return firstSale!;
}

type BuyerProfileSlice = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

/** Builds a `ConversationRow` for the Messages list — not stored server-side. */
export function getSyntheticBuyingConversationRow(buyer: BuyerProfileSlice): ConversationRow {
  const post = getMockRatingDemoPost();
  const s = post.seller;
  const now = new Date().toISOString();
  const lastMessage: MessageRow = {
    id: `${SYNTHETIC_RATING_CONVERSATION_ID}-preview`,
    conversation_id: LOCAL_DEMO_CONVERSATION_ID,
    sender_id: s.id,
    body: 'Sounds good — cash or Venmo works for me.',
    created_at: now,
  };
  return {
    id: SYNTHETIC_RATING_CONVERSATION_ID,
    listing_id: post.id,
    buyer_id: buyer.id,
    seller_id: s.id,
    created_at: now,
    updated_at: now,
    listing: {
      id: post.id,
      title: post.title,
      price: post.price,
      images: post.images,
    },
    buyer: {
      id: buyer.id,
      username: buyer.username,
      display_name: buyer.display_name,
      avatar_url: buyer.avatar_url,
    },
    seller: {
      id: s.id,
      username: s.username,
      display_name: s.displayName,
      avatar_url: s.avatar,
    },
    last_message: lastMessage,
  };
}

/** Placeholder for profile “received” ratings until `users.average_rating` is loaded from Supabase. */
export function getMockProfileRatings(): { averageOutOf5: number; count: number } {
  return { averageOutOf5: 4.6, count: 23 };
}
