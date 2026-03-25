import { supabase } from './supabase';

async function run() {
  const { data, error } = await supabase.auth.signUp({
    phone: '+15555555555',
    password: 'BuyinzUser!123',
  });
  console.log(data, error);
}
run();
