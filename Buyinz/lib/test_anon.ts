import { supabase } from './supabase';

async function run() {
  const { data, error } = await supabase.auth.signInAnonymously();
  console.log(data, error);
}
run();
