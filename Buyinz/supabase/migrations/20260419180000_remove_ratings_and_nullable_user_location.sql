-- Remove transaction ratings: table, trigger, denormalized columns on users.
-- Allow shoppers to omit location (no zip) on profile.

DROP TRIGGER IF EXISTS trg_user_ratings_stats ON public.user_ratings;

DROP FUNCTION IF EXISTS public.refresh_user_rating_stats();

DROP TABLE IF EXISTS public.user_ratings;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS average_rating,
  DROP COLUMN IF EXISTS rating_count;

-- Shoppers no longer require zip; location optional for account_type = 'user'.
ALTER TABLE public.users
  ALTER COLUMN location DROP NOT NULL;
