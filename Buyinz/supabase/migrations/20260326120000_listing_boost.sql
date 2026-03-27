-- Listing boost: eligibility (sold) and boost window (boosted_until).
-- Apply via Supabase SQL Editor or: supabase db push (if using CLI linked project).

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS sold boolean NOT NULL DEFAULT false;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS boosted_until timestamptz NULL;

CREATE OR REPLACE FUNCTION public.apply_listing_boost(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, user_id, type, sold, boosted_until
  INTO v_post
  FROM public.posts
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF v_post.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF v_post.type IS DISTINCT FROM 'sale' THEN
    RAISE EXCEPTION 'Only sale listings can be boosted';
  END IF;

  IF v_post.sold THEN
    RAISE EXCEPTION 'Sold listings cannot be boosted';
  END IF;

  IF v_post.boosted_until IS NOT NULL AND v_post.boosted_until > now() THEN
    RAISE EXCEPTION 'Listing is already boosted';
  END IF;

  UPDATE public.posts
  SET boosted_until = now() + interval '24 hours'
  WHERE id = p_listing_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_listing_boost(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_listing_boost(uuid) TO authenticated;
