import * as Linking from 'expo-linking';
import { supabase } from '@/supabase/client';
import { sanitizePublicAvatarUrl } from '@/lib/avatar';

/** Re-export the shared client (SecureStore session) — same instance as @/supabase/queries. */
export { supabase };

export type AccountType = 'user' | 'store';

export interface UserProfile {
  id?: string;
  account_type?: AccountType;
  display_name: string;
  username: string;
  /** Optional for shoppers; for stores mirrors `postal_code` for existing UI. */
  location?: string | null;
  bio?: string;
  avatar_url?: string;
  isVerified?: boolean;
  address_line1?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  address_string?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  formatted_address?: string | null;
}

/** Shopper: display name + username only (no zip/bio required). */
export function profileCoreComplete(profile: {
  display_name?: string | null;
  username?: string | null;
  location?: string | null;
}): boolean {
  const dn = profile.display_name?.trim();
  const un = profile.username?.trim();
  return !!(dn && un);
}

export function storeAddressPartsComplete(profile: {
  address_line1?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
}): boolean {
  return !!(
    profile.address_line1?.trim() &&
    profile.city?.trim() &&
    profile.region?.trim() &&
    profile.postal_code?.trim()
  );
}

export function composeStoreAddressString(parts: {
  address_line1: string;
  city: string;
  region: string;
  postal_code: string;
}): string {
  return [parts.address_line1, parts.city, parts.region, parts.postal_code]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');
}

function storeProfileCoreComplete(profile: {
  display_name?: string | null;
  username?: string | null;
  address_line1?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): boolean {
  return (
    !!profile.display_name?.trim() &&
    !!profile.username?.trim() &&
    storeAddressPartsComplete(profile) &&
    typeof profile.latitude === 'number' &&
    typeof profile.longitude === 'number'
  );
}

/** Row qualifies as a returning user: shoppers need name + username; stores need verified address. */
export function isProfileOnboardingComplete(profile: {
  account_type?: AccountType | null;
  display_name?: string | null;
  username?: string | null;
  location?: string | null;
  bio?: string | null;
  address_line1?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): boolean {
  const t = profile.account_type ?? 'user';
  if (t === 'store') {
    return storeProfileCoreComplete(profile);
  }
  return profileCoreComplete(profile);
}

/** @deprecated Use isProfileOnboardingComplete */
export const isBuyinzProfileComplete = isProfileOnboardingComplete;

export function normalizeUsername(username: string): string {
  return username.trim();
}

export function validateOnboardingSave(profile: UserProfile): void {
  const t = profile.account_type ?? 'user';
  if (t === 'store') {
    if (!storeProfileCoreComplete(profile)) {
      throw new Error(
        'Missing mandatory fields: business name, handle, full address, or location could not be verified.',
      );
    }
    return;
  }
  if (!profileCoreComplete(profile)) {
    throw new Error('Missing mandatory fields: Name and Username');
  }
}

/** Edit profile: shoppers — name + username; stores — full address rules; store bio optional. */
export function validateProfileUpdate(profile: UserProfile): void {
  validateOnboardingSave(profile);
}

export function validateProfileForSave(profile: UserProfile): void {
  validateOnboardingSave(profile);
}

export function buildUsersUpsertPayload(profile: UserProfile) {
  const type = profile.account_type ?? 'user';
  const base = {
    id: profile.id,
    account_type: type,
    display_name: profile.display_name.trim(),
    username: normalizeUsername(profile.username),
    bio: profile.bio?.trim() || null,
    avatar_url: sanitizePublicAvatarUrl(profile.avatar_url),
  };

  if (type === 'user') {
    const loc = profile.location?.trim();
    return {
      ...base,
      location: loc || null,
      address_line1: null,
      city: null,
      region: null,
      postal_code: null,
      address_string: null,
      latitude: null,
      longitude: null,
      formatted_address: null,
    };
  }

  const postal = profile.postal_code?.trim() ?? '';
  return {
    ...base,
    location: postal,
    address_line1: profile.address_line1?.trim() ?? null,
    city: profile.city?.trim() ?? null,
    region: profile.region?.trim() ?? null,
    postal_code: postal || null,
    address_string: profile.address_string?.trim() ?? null,
    latitude: profile.latitude ?? null,
    longitude: profile.longitude ?? null,
    formatted_address: profile.formatted_address?.trim() ?? null,
  };
}

export function isPostgresUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505';
}

export function validateEmailForAuth(email: string | undefined): asserts email is string {
  if (!email) {
    throw new Error('Valid email required');
  }
}

/** Returns true if username is not taken, or only taken by excludeUserId. */
export async function checkUsernameAvailable(
  username: string,
  options?: { excludeUserId?: string },
): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (!normalized) return false;

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', normalized)
    .maybeSingle();

  if (error) throw error;
  if (!data) return true;
  if (options?.excludeUserId && data.id === options.excludeUserId) return true;
  return false;
}

export async function saveProfile(profile: UserProfile) {
  validateProfileForSave(profile);

  const dbPayload = buildUsersUpsertPayload(profile);

  const { data, error } = await supabase
    .from('users')
    .upsert(dbPayload, { onConflict: 'username' })
    .select()
    .single();

  if (error) {
    if (isPostgresUniqueViolation(error)) {
      throw new Error('Username must be unique');
    }
    throw error;
  }
  return data;
}

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  formatted_address?: string;
  /** Non-blocking notices from geocoder (e.g. partial match). */
  warnings?: string[];
};

/** When set, Edge Function verifies ZIP/state against Google address_components. */
export type GeocodeOptions = {
  expectedPostalCode: string;
  expectedRegion: string;
};

async function messageFromFunctionsError(
  error: unknown,
  response?: Response,
): Promise<string> {
  const base =
    error instanceof Error ? error.message : 'Geocoding failed.';
  const res =
    response ??
    (error as { context?: Response }).context;
  if (res && typeof res.json === 'function') {
    try {
      const json = (await res.clone().json()) as {
        error?: string;
        message?: string;
      };
      if (json?.error && typeof json.error === 'string') return json.error;
      if (json?.message && typeof json.message === 'string') return json.message;
    } catch {
      /* ignore */
    }
  }
  return base;
}

/** Calls Edge Function `geocode-address` (Google Geocoding via server secret). */
export async function geocodeAddressString(
  address: string,
  options?: GeocodeOptions,
): Promise<GeocodeResult> {
  const trimmed = address.trim();
  if (!trimmed) {
    throw new Error('Address is required for geocoding.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Sign in again to verify your address.');
  }

  const { data, error, response: fnResponse } = await supabase.functions.invoke<
    GeocodeResult & { error?: string; warnings?: string[] }
  >('geocode-address', {
    body: {
      address: trimmed,
      ...(options
        ? {
            expected_postal_code: options.expectedPostalCode,
            expected_region: options.expectedRegion,
          }
        : {}),
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    const msg = await messageFromFunctionsError(error, fnResponse);
    throw new Error(msg);
  }

  const payload = data as GeocodeResult & { error?: string } | null;
  if (payload && typeof payload === 'object' && 'error' in payload && payload.error) {
    throw new Error(String(payload.error));
  }

  if (
    !payload ||
    typeof payload.latitude !== 'number' ||
    typeof payload.longitude !== 'number'
  ) {
    throw new Error('Invalid response from geocoding service.');
  }

  return {
    latitude: payload.latitude,
    longitude: payload.longitude,
    formatted_address: payload.formatted_address,
    warnings: Array.isArray(payload.warnings) ? payload.warnings : undefined,
  };
}

export async function authenticate(email?: string) {
  validateEmailForAuth(email);

  const authEmail = email;
  const dummyPassword = 'BuyinzUser!123';

  const { data: signInData } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password: dummyPassword,
  });

  if (signInData?.user) {
    return { status: 200, user: { id: signInData.user.id } };
  }

  const { data, error } = await supabase.auth.signUp({
    email: authEmail,
    password: dummyPassword,
  });

  if (error) {
    if (error.message.includes('rate limit')) {
      throw new Error(
        `Auth Error: You've hit the Supabase 3-per-hour signup limit! Please either use an email you already tested with, or go to your Supabase Dashboard -> Authentication -> Rate Limits and disable the email limit.`,
      );
    }
    throw new Error(`Auth Error: ${error.message}`);
  }

  if (!data?.user) {
    throw new Error('Failed to create internal auth session.');
  }

  return {
    status: 200,
    user: {
      id: data.user.id,
    },
  };
}

export type BuyinzUsersRow = {
  id: string;
  display_name: string;
  username: string;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  account_type: AccountType;
  address_line1: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  address_string: string | null;
  latitude: number | null;
  longitude: number | null;
  formatted_address: string | null;
};

const BUYINZ_USER_ROW_SELECT =
  'id, display_name, username, location, bio, avatar_url, account_type, address_line1, city, region, postal_code, address_string, latitude, longitude, formatted_address';

/** Load `public.users` for the authenticated user id (e.g. after OAuth). */
export async function fetchBuyinzUserRowByAuthId(userId: string): Promise<BuyinzUsersRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select(BUYINZ_USER_ROW_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data as BuyinzUsersRow;
  return {
    ...row,
    avatar_url: sanitizePublicAvatarUrl(row.avatar_url),
  };
}

export async function authenticateWithGoogle() {
  const redirectUrl = Linking.createURL('auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw new Error(`Google Auth Error: ${error.message}`);
  }

  return { data, redirectUrl };
}

/** Deletes the signed-in user's row in `public.users`. RLS must allow delete where `auth.uid() = id`. */
export async function deleteProfileForCurrentUser(userId: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }
}
