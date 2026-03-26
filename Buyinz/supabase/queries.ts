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
