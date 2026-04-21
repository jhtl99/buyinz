import { composeStoreAddressString, type AccountType } from '@/lib/supabase';
import { sanitizePublicAvatarUrl } from '@/lib/avatar';

import { supabase } from './client';

export type PublicUserProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  account_type: AccountType | null;
  formatted_address?: string | null;
  address_line1?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
};

/** Store profiles: prefer geocoder line, else composed street/city/region/ZIP, else legacy `location`. */
export function storeProfileAddressLine(profile: PublicUserProfile): string | null {
  const fa = profile.formatted_address?.trim();
  if (fa) return fa;
  const line1 = profile.address_line1?.trim() ?? '';
  const city = profile.city?.trim() ?? '';
  const region = profile.region?.trim() ?? '';
  const postal = profile.postal_code?.trim() ?? '';
  if (line1 && city && region && postal) {
    return composeStoreAddressString({
      address_line1: line1,
      city,
      region,
      postal_code: postal,
    });
  }
  const loc = profile.location?.trim();
  return loc || null;
}

export async function fetchUserPublicProfileById(
  userId: string,
): Promise<PublicUserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select(
      'id, username, display_name, avatar_url, location, bio, account_type, formatted_address, address_line1, city, region, postal_code',
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const profile = data as PublicUserProfile;
  return {
    ...profile,
    avatar_url: sanitizePublicAvatarUrl(profile.avatar_url),
  };
}
