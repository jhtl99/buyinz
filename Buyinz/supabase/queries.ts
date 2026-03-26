import { supabase } from './client';
import type { Post, SalePost, ISOPost, Seller } from '@/data/mockData';
import {
  coordinateFromLocation,
  DEFAULT_PITTSBURGH_COORDS,
  milesBetween,
  resolveNeighborhood,
  type GeoPoint,
} from '@/lib/discoveryLocation';
import type { ListingDraft, ImageAsset } from '@/lib/listings';

const DEFAULT_MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';
const IMAGE_BUCKET = 'listing-images';

export type SocialConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'follows_you';

export type SocialUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  location?: string | null;
  bio?: string | null;
};

type SocialConnectionRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
};

export type IncomingFollowRequest = {
  requestId: string;
  fromUser: SocialUser;
  createdAt: string;
};

export { DEFAULT_PITTSBURGH_COORDS };
export type { GeoPoint };

export interface DiscoverySalePost extends SalePost {
  neighborhoodTag: string;
  distanceMiles: number;
}

export interface DiscoveryFeedResult {
  neighborhood: string;
  listings: DiscoverySalePost[];
}

function isMissingSocialTable(error: any): boolean {
  if (!error) return false;
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return message.includes('social_connections') || message.includes('relation') || message.includes('does not exist');
}

function mapUserRowToSocialUser(row: any): SocialUser {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    location: row.location,
    bio: row.bio,
  };
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function mapRowToPost(row: any): Post {
  const user = row.users;

  const seller: Seller = {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatar: user.avatar_url ?? '',
    location: user.location ?? '',
    bio: user.bio ?? '',
    followers: 0,
    following: 0,
    posts: 0,
  };

  const base = {
    id: row.id,
    seller,
    title: row.title,
    description: row.description ?? '',
    category: row.category,
    likes: 0,
    comments: 0,
    liked: false,
    createdAt: timeAgo(row.created_at),
    hashtags: row.hashtags ?? [],
  };

  if (row.type === 'iso') {
    return {
      ...base,
      type: 'iso',
      budget: row.budget ?? undefined,
    } as ISOPost;
  }

  return {
    ...base,
    type: 'sale',
    images: row.images ?? [],
    price: row.price ?? 0,
    condition: row.condition ?? 'Good',
  } as SalePost;
}

export async function fetchFeedPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*, users(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRowToPost);
}

export async function searchUsers(
  currentUserId: string,
  queryText: string,
  limit = 25,
): Promise<Array<SocialUser & { connectionStatus: SocialConnectionStatus }>> {
  const term = queryText.trim();
  if (!term) return [];

  const wildcard = `%${term}%`;
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, location, bio')
    .neq('id', currentUserId)
    .or(`username.ilike.${wildcard},display_name.ilike.${wildcard}`)
    .limit(limit);

  if (usersError) throw usersError;
  const users = (usersData ?? []).map(mapUserRowToSocialUser);
  if (!users.length) return [];

  const userIds = users.map((u) => u.id);
  const { data: connections, error: connError } = await supabase
    .from('social_connections')
    .select('requester_id, addressee_id, status')
    .in('requester_id', [currentUserId, ...userIds])
    .in('addressee_id', [currentUserId, ...userIds]);

  if (connError && !isMissingSocialTable(connError)) throw connError;

  const statusByUserId = new Map<string, SocialConnectionStatus>();

  for (const conn of connections ?? []) {
    const { requester_id, addressee_id, status } = conn;

    // Outgoing relationship from current user has highest priority for button state.
    if (requester_id === currentUserId && userIds.includes(addressee_id)) {
      if (status === 'accepted') statusByUserId.set(addressee_id, 'accepted');
      else if (status === 'pending') statusByUserId.set(addressee_id, 'pending_sent');
    }

    // Incoming relationship should not be shown as "Following".
    if (addressee_id === currentUserId && userIds.includes(requester_id)) {
      const existing = statusByUserId.get(requester_id);
      if (existing === 'accepted' || existing === 'pending_sent') continue;

      if (status === 'pending') statusByUserId.set(requester_id, 'pending_received');
      else if (status === 'accepted') statusByUserId.set(requester_id, 'follows_you');
    }
  }

  return users.map((u) => ({
    ...u,
    connectionStatus: statusByUserId.get(u.id) ?? 'none',
  }));
}

export async function getRecommendedProfiles(currentUserId: string, limit = 5): Promise<SocialUser[]> {
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, location, bio')
    .neq('id', currentUserId)
    .limit(50);

  if (usersError) throw usersError;

  const users = (usersData ?? []).map(mapUserRowToSocialUser);
  if (!users.length) return [];

  const { data: connData, error: connError } = await supabase
    .from('social_connections')
    .select('requester_id, addressee_id, status')
    .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
    .in('status', ['pending', 'accepted']);

  if (connError && !isMissingSocialTable(connError)) throw connError;

  const hiddenIds = new Set<string>();
  for (const row of connData ?? []) {
    hiddenIds.add(row.requester_id === currentUserId ? row.addressee_id : row.requester_id);
  }

  return users.filter((u) => !hiddenIds.has(u.id)).slice(0, limit);
}

export async function sendFollowRequest(requesterId: string, addresseeId: string): Promise<{ created: boolean; reason?: string }> {
  if (requesterId === addresseeId) {
    return { created: false, reason: 'cannot_follow_self' };
  }

  // Prevent duplicate outgoing open relationships in the same direction.
  const { data: existingOutgoing, error: outgoingError } = await supabase
    .from('social_connections')
    .select('id, requester_id, addressee_id, status')
    .eq('requester_id', requesterId)
    .eq('addressee_id', addresseeId)
    .in('status', ['pending', 'accepted'])
    .maybeSingle();

  if (outgoingError && outgoingError.code !== 'PGRST116' && !isMissingSocialTable(outgoingError)) {
    throw outgoingError;
  }

  if (existingOutgoing) {
    return {
      created: false,
      reason: existingOutgoing.status === 'accepted' ? 'already_following' : 'already_pending',
    };
  }

  // If they already sent a pending request to you, ask user to accept instead of creating a cross-pending pair.
  const { data: incomingPending, error: incomingPendingError } = await supabase
    .from('social_connections')
    .select('id')
    .eq('requester_id', addresseeId)
    .eq('addressee_id', requesterId)
    .eq('status', 'pending')
    .maybeSingle();

  if (incomingPendingError && incomingPendingError.code !== 'PGRST116' && !isMissingSocialTable(incomingPendingError)) {
    throw incomingPendingError;
  }

  if (incomingPending) {
    return { created: false, reason: 'incoming_request_exists' };
  }

  const { error } = await supabase.from('social_connections').insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505') return { created: false, reason: 'already_pending' };
    throw error;
  }

  return { created: true };
}

export async function getIncomingFollowRequests(currentUserId: string): Promise<IncomingFollowRequest[]> {
  const { data: requests, error: reqError } = await supabase
    .from('social_connections')
    .select('id, requester_id, addressee_id, status, created_at')
    .eq('addressee_id', currentUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (reqError) {
    if (isMissingSocialTable(reqError)) return [];
    throw reqError;
  }

  const requesterIds = Array.from(new Set((requests ?? []).map((r) => r.requester_id)));
  if (!requesterIds.length) return [];

  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, location, bio')
    .in('id', requesterIds);

  if (usersError) throw usersError;

  const userById = new Map((usersData ?? []).map((u) => [u.id, mapUserRowToSocialUser(u)]));

  return (requests as SocialConnectionRow[]).flatMap((r) => {
    const fromUser = userById.get(r.requester_id);
    if (!fromUser) return [];
    return [{ requestId: r.id, fromUser, createdAt: r.created_at }];
  });
}

export async function respondToFollowRequest(requestId: string, action: 'accept' | 'decline'): Promise<void> {
  const status = action === 'accept' ? 'accepted' : 'declined';
  const { error } = await supabase
    .from('social_connections')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) throw error;
}

export async function getFollowers(currentUserId: string): Promise<SocialUser[]> {
  const { data: rows, error } = await supabase
    .from('social_connections')
    .select('requester_id')
    .eq('addressee_id', currentUserId)
    .eq('status', 'accepted');

  if (error) {
    if (isMissingSocialTable(error)) return [];
    throw error;
  }

  const ids = (rows ?? []).map((r) => r.requester_id);
  if (!ids.length) return [];

  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, location, bio')
    .in('id', ids);

  if (usersError) throw usersError;
  return (usersData ?? []).map(mapUserRowToSocialUser);
}

export async function getFollowing(currentUserId: string): Promise<SocialUser[]> {
  const { data: rows, error } = await supabase
    .from('social_connections')
    .select('addressee_id')
    .eq('requester_id', currentUserId)
    .eq('status', 'accepted');

  if (error) {
    if (isMissingSocialTable(error)) return [];
    throw error;
  }

  const ids = (rows ?? []).map((r) => r.addressee_id);
  if (!ids.length) return [];

  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, location, bio')
    .in('id', ids);

  if (usersError) throw usersError;
  return (usersData ?? []).map(mapUserRowToSocialUser);
}

export async function fetchDiscoveryFeed(options: {
  userCoords: GeoPoint;
  radiusMiles: number;
}): Promise<DiscoveryFeedResult> {
  const { userCoords, radiusMiles } = options;
  const userNeighborhood = resolveNeighborhood(userCoords);
  const feed = await fetchFeedPosts();

  const salePosts = feed.filter((post): post is SalePost => post.type === 'sale');

  const enriched = salePosts.map((post) => {
    const postCoords = coordinateFromLocation(post.seller.location) ?? DEFAULT_PITTSBURGH_COORDS;
    const neighborhoodTag = resolveNeighborhood(postCoords);
    const distanceMiles = milesBetween(userCoords, postCoords);
    return {
      ...post,
      neighborhoodTag,
      distanceMiles,
    } satisfies DiscoverySalePost;
  });

  const filtered =
    radiusMiles <= 0
      ? enriched.filter((post) => post.neighborhoodTag === userNeighborhood)
      : enriched.filter((post) => post.distanceMiles <= radiusMiles);

  const listings = (filtered.length > 0 ? filtered : enriched)
    .slice()
    .sort((a, b) => {
      const aIsLocal = a.neighborhoodTag === userNeighborhood ? 1 : 0;
      const bIsLocal = b.neighborhoodTag === userNeighborhood ? 1 : 0;

      if (aIsLocal !== bIsLocal) return bIsLocal - aIsLocal;
      if (Math.abs(a.distanceMiles - b.distanceMiles) > 0.05) {
        return a.distanceMiles - b.distanceMiles;
      }
      return b.likes - a.likes;
    });

  return {
    neighborhood: userNeighborhood,
    listings,
  };
}

async function uploadListingImages(images: ImageAsset[]): Promise<string[]> {
  const urls: string[] = [];

  for (const img of images) {
    const ext = img.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    const response = await fetch(img.uri);
    const arraybuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, arraybuffer, { contentType });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(IMAGE_BUCKET)
      .getPublicUrl(path);

    urls.push(urlData.publicUrl);
  }

  return urls;
}

export async function insertPost(draft: ListingDraft, userId?: string): Promise<string> {
  const imageUrls = await uploadListingImages(draft.images);

  const hashtags = draft.hashtags
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`));

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId || DEFAULT_MOCK_USER_ID,
      type: 'sale',
      title: draft.title,
      description: draft.description || null,
      price: parseFloat(draft.price) || 0,
      condition: draft.condition,
      category: draft.category!,
      images: imageUrls,
      hashtags,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// ─── Messaging ───────────────────────────────────────────────

export interface ConversationRow {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  listing: {
    id: string;
    title: string;
    price: number | null;
    images: string[];
  };
  buyer: { id: string; username: string; display_name: string; avatar_url: string | null };
  seller: { id: string; username: string; display_name: string; avatar_url: string | null };
  last_message: MessageRow | null;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export async function getOrCreateConversation(
  listingId: string,
  buyerId: string,
  sellerId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function fetchConversations(userId: string): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, listing_id, buyer_id, seller_id, created_at, updated_at,
      listing:posts!listing_id(id, title, price, images),
      buyer:users!buyer_id(id, username, display_name, avatar_url),
      seller:users!seller_id(id, username, display_name, avatar_url)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const convos = (data ?? []) as any[];

  const withLastMessage = await Promise.all(
    convos.map(async (c) => {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1);

      return { ...c, last_message: msgs?.[0] ?? null } as ConversationRow;
    }),
  );

  return withLastMessage;
}

export async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<MessageRow> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select('*')
    .single();

  if (error) throw error;

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

export function subscribeToMessages(
  conversationId: string,
  onMessage: (msg: MessageRow) => void,
) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload.new as MessageRow),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Transaction completion & ratings ─────────────────────────

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
    // Quiet until ratings migration is applied (see supabase/migrations/20250325120000_transaction_ratings.sql).
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
