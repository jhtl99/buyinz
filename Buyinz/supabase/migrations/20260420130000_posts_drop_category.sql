-- Remove listing category: no longer collected in app or stored.

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_category_check;

ALTER TABLE public.posts
  DROP COLUMN IF EXISTS category;
