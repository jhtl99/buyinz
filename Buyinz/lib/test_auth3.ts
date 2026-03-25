import { supabase } from './supabase';

async function run() {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'buyer123@gmail.com',
    password: 'BuyinzUser!123',
  });
  console.log(signInData, signInError);
}
run();
