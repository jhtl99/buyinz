/**
 * Single Supabase client for the app — OAuth, queries, and RPCs share this instance.
 * Auth uses AsyncStorage (session payloads exceed SecureStore’s size limit).
 *
 * During `expo export` / EAS Update, Expo Router static-renders the web bundle in Node
 * where `window` is undefined; AsyncStorage’s web implementation reads `window`, so we
 * use an in-memory adapter only for that environment.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://xoohzqggqzpdzaymztvq.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvb2h6cWdncXpwZHpheW16dHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDE5ODUsImV4cCI6MjA4OTk3Nzk4NX0.UaXoaNQX8iv9jUuUehxhFSAX01ft9Y9J_oZVZ6dwEw4';

function createAuthStorage() {
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    const memory = new Map<string, string>();
    return {
      getItem: async (key: string) => memory.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: async (key: string) => {
        memory.delete(key);
      },
    };
  }

  return {
    getItem: (key: string) => AsyncStorage.getItem(key),
    setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
    removeItem: (key: string) => AsyncStorage.removeItem(key),
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createAuthStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
