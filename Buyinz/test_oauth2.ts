import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://xoohzqggqzpdzaymztvq.supabase.co', 'dummy');
console.log(typeof supabase.auth.exchangeCodeForSession);
