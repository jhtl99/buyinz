-- Allow users to delete their own profile row (e.g. from Edit profile).
drop policy if exists "users_delete_own_authenticated" on public.users;
create policy "users_delete_own_authenticated"
on public.users
for delete
to authenticated
using (auth.uid() = id);
