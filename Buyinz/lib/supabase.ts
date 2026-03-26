import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

const supabaseUrl = 'https://xoohzqggqzpdzaymztvq.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key_for_testing';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface UserProfile {
  id?: string;
  display_name: string;
  username: string;
  location: string;
  bio?: string;
  avatar_url?: string;
  isVerified?: boolean;
}

export async function saveProfile(profile: UserProfile) {
  if (!profile.display_name || !profile.username || !profile.location) {
    throw new Error('Missing mandatory fields: Name, Username, or Zip Code');
  }

  // Set up payload specifically for the `users` table layout
  const dbPayload = {
    id: profile.id,
    display_name: profile.display_name,
    username: profile.username,
    location: profile.location,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
  };

  const { data, error } = await supabase
    .from('users')
    .upsert(dbPayload, { onConflict: 'username' })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Postgres unique violation
      throw new Error('Username must be unique');
    }
    throw error;
  }
  return data;
}

export async function authenticate(email?: string) {
  if (!email) {
    throw new Error('Valid email required');
  }
  
  // Actually sign up the user in Supabase auth so that the ID exists in auth.users
  const authEmail = email;
  const dummyPassword = 'BuyinzUser!123'; // Use a consistent dummy password for testing so we can log back in
  
  // 1. First, attempt to sign in. This avoids hitting the strict 3-per-hour signup limit for existing test users.
  const { data: signInData } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password: dummyPassword,
  });

  if (signInData?.user) {
    return { status: 200, user: { id: signInData.user.id } };
  }

  // 2. If sign in fails (user doesn't exist), try to sign up
  const { data, error } = await supabase.auth.signUp({
    email: authEmail,
    password: dummyPassword,
  });
  
  if (error) {
    if (error.message.includes('rate limit')) {
      throw new Error(`Auth Error: You've hit the Supabase 3-per-hour signup limit! Please either use an email you already tested with, or go to your Supabase Dashboard -> Authentication -> Rate Limits and disable the email limit.`);
    }
    throw new Error(`Auth Error: ${error.message}`);
  }
  
  if (!data?.user) {
    throw new Error('Failed to create internal auth session.');
  }

  return {
    status: 200,
    user: {
      id: data.user.id
    }
  };
}

export async function authenticateWithGoogle() {
  // Must match Supabase Dashboard → Auth → URL Configuration → Redirect URLs (e.g. exp://**/--/auth/callback).
  // If redirectTo is not allowlisted, Supabase falls back to Site URL (e.g. localhost:3000) and breaks on device.
  const redirectUrl = Linking.createURL('auth/callback');

  // Using Supabase OAuth for Google
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
  const { error } = await supabase
    .from('users')
    .delete()
    .match({ username });
    
  if (error) {
    console.error('Error deleting profile:', error);
    // Ignore error for mock purposes if table doesn't exist yet
  }
  return true;
}
