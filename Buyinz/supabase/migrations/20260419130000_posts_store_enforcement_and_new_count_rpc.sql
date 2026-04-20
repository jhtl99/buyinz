-- Enforce: only store accounts may INSERT sale listings (server-side).
-- RPC: batch count of active (not sold) sale posts in the last rolling 24 hours per store.

CREATE INDEX IF NOT EXISTS posts_store_active_created_at_idx
  ON public.posts (user_id, created_at DESC)
  WHERE type = 'sale' AND sold = false;

-- ---------------------------------------------------------------------------
-- BEFORE INSERT: sale listings require authenticated store account
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_sale_listing_store_account()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'sale' THEN
    IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Sale listings must be created by the authenticated user';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.account_type = 'store'
    ) THEN
      RAISE EXCEPTION 'Only store accounts can create sale listings';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_enforce_store_sale_insert ON public.posts;
CREATE TRIGGER posts_enforce_store_sale_insert
  BEFORE INSERT ON public.posts
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_sale_listing_store_account();

-- ---------------------------------------------------------------------------
-- New sale listings in last 24 hours (for badges); bypasses RLS via definer
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.new_sale_listings_count_last_24h_by_stores(p_store_user_ids uuid[])
RETURNS TABLE (store_user_id uuid, new_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, count(*)::bigint
  FROM public.posts p
  WHERE p.user_id = ANY(p_store_user_ids)
    AND p.type = 'sale'
    AND p.sold = false
    AND p.created_at >= now() - interval '24 hours'
  GROUP BY p.user_id;
$$;

REVOKE ALL ON FUNCTION public.new_sale_listings_count_last_24h_by_stores(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.new_sale_listings_count_last_24h_by_stores(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.new_sale_listings_count_last_24h_by_stores(uuid[]) TO anon;
