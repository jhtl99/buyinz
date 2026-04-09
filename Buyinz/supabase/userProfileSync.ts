import { supabase } from './client';

/** Persists Buyinz Pro to Supabase so other users can see the badge on public profiles. */
export async function syncBuyinzProToSupabase(userId: string, buyinzPro: boolean): Promise<void> {
  const { error } = await supabase.from('users').update({ buyinz_pro: buyinzPro }).eq('id', userId);
  if (error) throw error;
}
