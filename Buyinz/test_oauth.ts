import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://xoohzqggqzpdzaymztvq.supabase.co';
const supabaseKey = 'dummy_key_for_testing';
const supabase = createClient(supabaseUrl, supabaseKey);
console.log(typeof supabase.auth.getSessionFromUrl);
