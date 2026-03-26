import { supabase } from './client';
import type { Post, SalePost, ISOPost, Seller } from '@/data/mockData';
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

export async function insertPost(draft: ListingDraft): Promise<string> {
  const imageUrls = await uploadListingImages(draft.images);

  const hashtags = draft.hashtags
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`));

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: DEFAULT_MOCK_USER_ID,
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
