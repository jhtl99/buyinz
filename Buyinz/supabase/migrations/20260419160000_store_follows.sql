-- Shoppers follow stores; follower counts exposed via SECURITY DEFINER RPC.

CREATE TABLE public.store_follows (
  follower_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, store_id),
  CONSTRAINT store_follows_no_self CHECK (follower_id <> store_id)
);

CREATE INDEX store_follows_store_id_idx ON public.store_follows (store_id);
CREATE INDEX store_follows_follower_id_idx ON public.store_follows (follower_id);

COMMENT ON TABLE public.store_follows IS 'Shopper (user) follows a store account; no backfill, counts start at zero.';

ALTER TABLE public.store_follows ENABLE ROW LEVEL SECURITY;

-- Shoppers see their own follow rows; stores see who follows them.
CREATE POLICY store_follows_select_own_or_store
ON public.store_follows
FOR SELECT
TO authenticated
USING (follower_id = auth.uid() OR store_id = auth.uid());

CREATE POLICY store_follows_insert_follower
ON public.store_follows
FOR INSERT
TO authenticated
WITH CHECK (follower_id = auth.uid());

CREATE POLICY store_follows_delete_follower
ON public.store_follows
FOR DELETE
TO authenticated
USING (follower_id = auth.uid());

CREATE OR REPLACE FUNCTION public.enforce_store_follow_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = NEW.store_id AND u.account_type = 'store'
  ) THEN
    RAISE EXCEPTION 'Can only follow store accounts';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = NEW.follower_id AND u.account_type = 'user'
  ) THEN
    RAISE EXCEPTION 'Only shopper accounts can follow stores';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_follows_enforce_rules ON public.store_follows;
CREATE TRIGGER store_follows_enforce_rules
  BEFORE INSERT ON public.store_follows
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_store_follow_rules();

-- Public follower counts for store ids (no row-level follow graph leakage beyond aggregates).
CREATE OR REPLACE FUNCTION public.store_follower_counts(p_store_ids uuid[])
RETURNS TABLE (store_id uuid, follower_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.store_id, count(*)::bigint
  FROM public.store_follows f
  WHERE f.store_id = ANY(p_store_ids)
  GROUP BY f.store_id;
$$;

REVOKE ALL ON FUNCTION public.store_follower_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_follower_counts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_follower_counts(uuid[]) TO anon;
