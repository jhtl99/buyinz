import { supabase } from './client';

export type PublicUserProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
};

export async function fetchUserPublicProfileById(
  userId: string,
): Promise<PublicUserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, location, bio')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as PublicUserProfile;
}
