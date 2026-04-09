-- Allow first-time onboarding: authenticated users may insert a row where id = auth.uid().
drop policy if exists "users_insert_own_authenticated" on public.users;
create policy "users_insert_own_authenticated"
on public.users
for insert
to authenticated
with check (auth.uid() = id);
