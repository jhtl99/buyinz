import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
const supabaseUrl = 'https://xoohzqggqzpdzaymztvq.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvb2h6cWdncXpwZHpheW16dHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDE5ODUsImV4cCI6MjA4OTk3Nzk4NX0.UaXoaNQX8iv9jUuUehxhFSAX01ft9Y9J_oZVZ6dwEw4';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
