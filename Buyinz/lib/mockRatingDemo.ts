import type { SalePost } from '@/data/mockData';
import { MOCK_FEED_POSTS, MOCK_SELLERS } from '@/data/mockData';
import type { ConversationRow, MessageRow } from '@/supabase/queries';

/*
 * Inbox / local-only rating threads (no Supabase rows). See `mockDemo` route param in chat.
 */

export const LOCAL_DEMO_BUYING_CONVERSATION_ID =
  '00000000-0000-0000-0000-0000000000buy';
export const LOCAL_DEMO_SELLING_CONVERSATION_ID =
  '00000000-0000-0000-0000-0000000000sel';

/** @deprecated Use LOCAL_DEMO_BUYING_CONVERSATION_ID */
export const LOCAL_DEMO_CONVERSATION_ID = LOCAL_DEMO_BUYING_CONVERSATION_ID;

/** Buying tab synthetic row → `mockDemo=1` (seller / pgh_moving_sale already finished). */
export const SYNTHETIC_RATING_CONVERSATION_ID = '__buyinz_synthetic_rating_conversation__';

/** Selling tab synthetic row → `mockDemo=2` (you can finish first; buyer has not). */
export const SYNTHETIC_SELLING_RATING_CONVERSATION_ID =
  '__buyinz_synthetic_selling_rating_conversation__';

/** Seller in the synthetic buying thread (pgh_moving_sale). */
export const MOCK_RATING_DEMO_PEER = MOCK_SELLERS[1];

/** Buyer persona in the synthetic selling thread (steelcity_thrift). */
export const MOCK_SELLING_SCENARIO_BUYER = MOCK_SELLERS[0];

/** Listing for synthetic buying thread. */
export function getMockRatingDemoPost(): SalePost {
  const fromPeer = MOCK_FEED_POSTS.find(
    (p): p is SalePost => p.type === 'sale' && p.seller.id === MOCK_RATING_DEMO_PEER.id,
  );
  if (fromPeer) return fromPeer;
  const firstSale = MOCK_FEED_POSTS.find((p): p is SalePost => p.type === 'sale');
  return firstSale!;
}

/** Different item — MCM chair listing (used as “your” listing in selling scenario). */
export function getMockSellingRatingDemoPost(): SalePost {
  const post = MOCK_FEED_POSTS.find(
    (p): p is SalePost => p.type === 'sale' && p.seller.id === MOCK_SELLERS[2].id,
  );
  if (post) return post;
  const any = MOCK_FEED_POSTS.find((p): p is SalePost => p.type === 'sale');
  return any!;
}

type BuyerProfileSlice = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type SellerProfileSlice = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export function getSyntheticBuyingConversationRow(buyer: BuyerProfileSlice): ConversationRow {
  const post = getMockRatingDemoPost();
  const s = post.seller;
  const now = new Date().toISOString();
  const lastMessage: MessageRow = {
    id: `${SYNTHETIC_RATING_CONVERSATION_ID}-preview`,
    conversation_id: LOCAL_DEMO_BUYING_CONVERSATION_ID,
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

export function getSyntheticSellingConversationRow(seller: SellerProfileSlice): ConversationRow {
  const post = getMockSellingRatingDemoPost();
  const b = MOCK_SELLING_SCENARIO_BUYER;
  const now = new Date().toISOString();
  const lastMessage: MessageRow = {
    id: `${SYNTHETIC_SELLING_RATING_CONVERSATION_ID}-preview`,
    conversation_id: LOCAL_DEMO_SELLING_CONVERSATION_ID,
    sender_id: b.id,
    body: 'Is the chair still available? I can pick up Saturday.',
    created_at: now,
  };
  return {
    id: SYNTHETIC_SELLING_RATING_CONVERSATION_ID,
    listing_id: post.id,
    buyer_id: b.id,
    seller_id: seller.id,
    created_at: now,
    updated_at: now,
    listing: {
      id: post.id,
      title: post.title,
      price: post.price,
      images: post.images,
    },
    buyer: {
      id: b.id,
      username: b.username,
      display_name: b.displayName,
      avatar_url: b.avatar,
    },
    seller: {
      id: seller.id,
      username: seller.username,
      display_name: seller.display_name,
      avatar_url: seller.avatar_url,
    },
    last_message: lastMessage,
  };
}
