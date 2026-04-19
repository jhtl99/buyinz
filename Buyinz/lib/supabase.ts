import * as Linking from 'expo-linking';
import { supabase } from '@/supabase/client';

/** Re-export the shared client (SecureStore session) — same instance as @/supabase/queries. */
export { supabase };

export interface UserProfile {
  id?: string;
  display_name: string;
  username: string;
  location: string;
  bio?: string;
  avatar_url?: string;
  isVerified?: boolean;
}

/** Name, username, zip — bio optional (onboarding + main app entry). */
export function profileCoreComplete(profile: {
  display_name?: string | null;
  username?: string | null;
  location?: string | null;
}): boolean {
  const dn = profile.display_name?.trim();
  const un = profile.username?.trim();
  const loc = profile.location?.trim();
  return !!(dn && un && loc);
}

/** Row qualifies as a returning user: can skip onboarding (bio optional). */
export function isProfileOnboardingComplete(profile: {
  display_name?: string | null;
  username?: string | null;
  location?: string | null;
  bio?: string | null;
}): boolean {
  return profileCoreComplete(profile);
}

/** @deprecated Use isProfileOnboardingComplete */
export const isBuyinzProfileComplete = isProfileOnboardingComplete;

export function normalizeUsername(username: string): string {
  return username.trim();
}

export function validateOnboardingSave(profile: UserProfile): void {
  if (!profileCoreComplete(profile)) {
    throw new Error('Missing mandatory fields: Name, Username, or Zip Code');
  }
}

/** Edit profile: same required core fields; bio optional. */
export function validateProfileUpdate(profile: UserProfile): void {
  validateOnboardingSave(profile);
}

export function validateProfileForSave(profile: UserProfile): void {
  validateOnboardingSave(profile);
}

export function buildUsersUpsertPayload(profile: UserProfile) {
  return {
    id: profile.id,
    display_name: profile.display_name.trim(),
    username: normalizeUsername(profile.username),
    location: profile.location.trim(),
    bio: profile.bio?.trim() || undefined,
    avatar_url: profile.avatar_url,
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
};

/** Load `public.users` for the authenticated user id (e.g. after OAuth). */
export async function fetchBuyinzUserRowByAuthId(userId: string): Promise<BuyinzUsersRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, username, location, bio, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as BuyinzUsersRow;
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
