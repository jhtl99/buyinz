-- Lets signed-in users read their own row from `public.users`, including `average_rating` and
-- `rating_count` (see 20250325120000_transaction_ratings.sql). Policies have no effect until
-- the table has row level security enabled (enable in Dashboard if needed).
--
-- If you already use a broad SELECT (e.g. public profiles), this policy is additive (OR logic).

drop policy if exists "users_select_own_authenticated" on public.users;
create policy "users_select_own_authenticated"
on public.users
for select
to authenticated
using (auth.uid() = id);
