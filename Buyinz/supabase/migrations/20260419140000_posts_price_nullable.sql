-- Allow NULL price = no price entered on listing; explicit 0 remains valid.
-- Existing rows are unchanged (legacy numeric values stay as stored).

alter table public.posts
  alter column price drop not null;

comment on column public.posts.price is 'Sale price; NULL means no price shown, 0 means free/zero.';
