-- Run in Supabase SQL Editor (or your migration runner).
-- Adds average rating on users, mutual completion on conversations, and per-transaction ratings.

alter table public.users
  add column if not exists average_rating numeric(4, 2) not null default 0,
  add column if not exists rating_count integer not null default 0;

alter table public.conversations
  add column if not exists buyer_marked_complete_at timestamptz,
  add column if not exists seller_marked_complete_at timestamptz;

create table if not exists public.user_ratings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  rater_id uuid not null references auth.users (id) on delete cascade,
  ratee_id uuid not null references auth.users (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  unique (conversation_id, rater_id)
);

create index if not exists idx_user_ratings_ratee on public.user_ratings (ratee_id);

create or replace function public.refresh_user_rating_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  avg_stars numeric;
  cnt integer;
begin
  select coalesce(round(avg(stars)::numeric, 2), 0), count(*)::int
  into avg_stars, cnt
  from public.user_ratings
  where ratee_id = NEW.ratee_id;

  update public.users
  set average_rating = avg_stars,
      rating_count = cnt
  where id = NEW.ratee_id;

  return NEW;
end;
$$;

drop trigger if exists trg_user_ratings_stats on public.user_ratings;
create trigger trg_user_ratings_stats
after insert on public.user_ratings
for each row execute procedure public.refresh_user_rating_stats();

alter table public.user_ratings enable row level security;

drop policy if exists "user_ratings_insert_own" on public.user_ratings;
create policy "user_ratings_insert_own"
on public.user_ratings for insert
with check (auth.uid() = rater_id);

drop policy if exists "user_ratings_select_parties" on public.user_ratings;
create policy "user_ratings_select_parties"
on public.user_ratings for select
using (auth.uid() = rater_id or auth.uid() = ratee_id);

-- If marking complete fails with RLS, add an UPDATE policy on conversations for buyer/seller.
