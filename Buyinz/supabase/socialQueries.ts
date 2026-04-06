import { supabase } from './client';
import {
  isMissingSocialTable,
  mapUserRowToSocialUser,
  isNoRowsPostgrestError,
} from './socialTable';
import type { IncomingFollowRequest, SocialConnectionStatus, SocialUser } from './socialTypes';

type SocialConnectionRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
};

/** Accepted outgoing follows: user ids the current user follows (first degree). */
export async function getFollowingUserIds(currentUserId: string): Promise<string[]> {
  const { data: rows, error } = await supabase
    .from('social_connections')
    .select('addressee_id')
    .eq('requester_id', currentUserId)
    .eq('status', 'accepted');

  if (error) {
    if (isMissingSocialTable(error)) return [];
    throw error;
  }

  return (rows ?? []).map((r) => r.addressee_id);
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

    if (requester_id === currentUserId && userIds.includes(addressee_id)) {
      if (status === 'accepted') statusByUserId.set(addressee_id, 'accepted');
      else if (status === 'pending') statusByUserId.set(addressee_id, 'pending_sent');
    }

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

export async function sendFollowRequest(
  requesterId: string,
  addresseeId: string,
): Promise<{ created: boolean; reason?: string }> {
  if (requesterId === addresseeId) {
    return { created: false, reason: 'cannot_follow_self' };
  }

  const { data: existingOutgoing, error: outgoingError } = await supabase
    .from('social_connections')
    .select('id, requester_id, addressee_id, status')
    .eq('requester_id', requesterId)
    .eq('addressee_id', addresseeId)
    .in('status', ['pending', 'accepted'])
    .maybeSingle();

  if (outgoingError && !isNoRowsPostgrestError(outgoingError) && !isMissingSocialTable(outgoingError)) {
    throw outgoingError;
  }

  if (existingOutgoing) {
    return {
      created: false,
      reason: existingOutgoing.status === 'accepted' ? 'already_following' : 'already_pending',
    };
  }

  const { data: incomingPending, error: incomingPendingError } = await supabase
    .from('social_connections')
    .select('id')
    .eq('requester_id', addresseeId)
    .eq('addressee_id', requesterId)
    .eq('status', 'pending')
    .maybeSingle();

  if (
    incomingPendingError &&
    !isNoRowsPostgrestError(incomingPendingError) &&
    !isMissingSocialTable(incomingPendingError)
  ) {
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
  const ids = await getFollowingUserIds(currentUserId);
  if (!ids.length) return [];

  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, location, bio')
    .in('id', ids);

  if (usersError) throw usersError;
  return (usersData ?? []).map(mapUserRowToSocialUser);
}
