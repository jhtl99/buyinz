-- Batch: newest non-sold sale listing preview image URLs per store + total active sale count.
-- Used by Home / Explore store list cells.
-- `posts.images` is text[] (first URL is images[1]); not jsonb — do not use ->> on it.

CREATE OR REPLACE FUNCTION public.store_sale_listing_preview_urls(
  p_store_user_ids uuid[],
  p_per_store int DEFAULT 3
)
RETURNS TABLE (store_user_id uuid, preview_urls text[], total_sale_listings bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH store_ids AS (
    SELECT DISTINCT unnest(p_store_user_ids) AS id
  ),
  counts AS (
    SELECT p.user_id, count(*)::bigint AS cnt
    FROM public.posts p
    WHERE p.type = 'sale'
      AND p.sold = false
      AND p.user_id = ANY(p_store_user_ids)
    GROUP BY p.user_id
  ),
  ranked AS (
    SELECT
      p.user_id,
      NULLIF(btrim(p.images[1]), '') AS img,
      row_number() OVER (PARTITION BY p.user_id ORDER BY p.created_at DESC) AS rn
    FROM public.posts p
    WHERE p.type = 'sale'
      AND p.sold = false
      AND p.user_id = ANY(p_store_user_ids)
  ),
  picks AS (
    SELECT
      r.user_id,
      coalesce(array_agg(r.img ORDER BY r.rn), ARRAY[]::text[]) AS urls
    FROM ranked r
    WHERE r.rn <= p_per_store AND r.img IS NOT NULL
    GROUP BY r.user_id
  )
  SELECT
    s.id AS store_user_id,
    coalesce(pk.urls, ARRAY[]::text[]) AS preview_urls,
    coalesce(c.cnt, 0::bigint) AS total_sale_listings
  FROM store_ids s
  LEFT JOIN counts c ON c.user_id = s.id
  LEFT JOIN picks pk ON pk.user_id = s.id;
$$;

REVOKE ALL ON FUNCTION public.store_sale_listing_preview_urls(uuid[], int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_sale_listing_preview_urls(uuid[], int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_sale_listing_preview_urls(uuid[], int) TO anon;
