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

export function validateProfileForSave(profile: UserProfile): void {
  if (!profile.display_name || !profile.username || !profile.location) {
    throw new Error('Missing mandatory fields: Name, Username, or Zip Code');
  }
}

export function buildUsersUpsertPayload(profile: UserProfile) {
  return {
    id: profile.id,
    display_name: profile.display_name,
    username: profile.username,
    location: profile.location,
    bio: profile.bio,
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

export async function deleteProfile(username: string) {
  const { error } = await supabase.from('users').delete().match({ username });

  if (error) {
    console.error('Error deleting profile:', error);
  }
  return true;
}
