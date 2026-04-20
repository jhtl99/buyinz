-- Create-listing uses Tops, Bottoms, Accessories, Other (see lib/listings.ts).
-- Older DB check constraints may omit these and reject valid inserts.

alter table public.posts drop constraint if exists posts_category_check;

-- Non-blank category when present; allows Tops, Bottoms, Accessories, Other and legacy labels.
alter table public.posts add constraint posts_category_check check (
  length(trim(category)) > 0
  and length(category) <= 80
);

comment on constraint posts_category_check on public.posts is
  'Category must be a non-empty string up to 80 chars; app restricts allowed values.';
