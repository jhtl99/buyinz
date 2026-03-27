-- Allow buyer/seller to update conversation rows (e.g. mark transaction complete).
-- Participant-only; pair with columns from 20250325120000_transaction_ratings.sql.

drop policy if exists "conversations_update_participants" on public.conversations;
create policy "conversations_update_participants"
on public.conversations for update
using (auth.uid() = buyer_id or auth.uid() = seller_id)
with check (auth.uid() = buyer_id or auth.uid() = seller_id);
