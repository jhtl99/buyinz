-- Buyinz Pro flag on public.users (synced from app on subscribe) + RLS for read/update.

alter table public.users
  add column if not exists buyinz_pro boolean not null default false;

comment on column public.users.buyinz_pro is 'Server-visible Buyinz Pro subscription; kept in sync when user subscribes in-app.';

-- Allow authenticated users to read profile rows (social search, public profiles).
-- OR-combines with existing restrictive policies if present.
drop policy if exists "users_select_authenticated_all" on public.users;
create policy "users_select_authenticated_all"
on public.users
for select
to authenticated
using (true);

-- Owner can update own row (e.g. buyinz_pro); tighten in app to only send allowed columns.
drop policy if exists "users_update_own_authenticated" on public.users;
create policy "users_update_own_authenticated"
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
