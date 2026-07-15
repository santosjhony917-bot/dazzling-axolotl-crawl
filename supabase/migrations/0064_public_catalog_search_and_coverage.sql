-- Public, grounded catalog read API.
-- Depends on 0063_harden_catalog_rls_and_eligibility.sql.

BEGIN;

-- Item/variant projection used by every public search surface. The view owner reads the
-- protected base tables, but the WHERE contract ensures no unpublished or unaudited row
-- can cross the projection boundary.
CREATE OR REPLACE VIEW public.public_catalog_menu_items
WITH (security_barrier = true, security_invoker = false)
AS
WITH eligible_base AS (
  SELECT
    mi.*,
    mc.restaurant_id,
    mc.name AS category_name,
    r.name AS restaurant_name,
    r.category AS restaurant_category,
    r.neighborhood AS restaurant_neighborhood,
    r.city AS restaurant_city,
    r.state AS restaurant_state,
    r.latitude AS restaurant_latitude,
    r.longitude AS restaurant_longitude,
    r.opening_hours AS restaurant_opening_hours,
    rr.source_checked_at AS menu_verified_at
  FROM public.menu_items AS mi
  JOIN public.menu_categories AS mc ON mc.id = mi.category_id
  JOIN public.restaurants AS r ON r.id = mc.restaurant_id
  JOIN public.catalog_restaurant_readiness AS rr ON rr.restaurant_id = r.id
  WHERE rr.is_publicly_eligible
    AND COALESCE(mc.is_active, true)
    AND COALESCE(mi.is_active, true)
    AND COALESCE(mi.is_public_searchable, true)
    AND COALESCE(mi.is_illustrative, false) = false
    AND COALESCE(mi.needs_review, false) = false
    AND NULLIF(btrim(mi.source_url), '') IS NOT NULL
),
base_rows AS (
  SELECT
    concat(eb.id::text, ':base') AS result_id,
    'item'::text AS result_kind,
    eb.id AS item_id,
    NULL::uuid AS option_id,
    COALESCE(eb.display_name, eb.search_display_name, eb.name) AS item_name,
    eb.description AS item_description,
    CASE
      WHEN eb.price_type IN ('free', 'included') THEN COALESCE(
        eb.promotional_price, eb.display_price, eb.price_min, eb.price, eb.price_max, 0
      )
      ELSE COALESCE(
        eb.promotional_price, eb.display_price, eb.price_min, eb.price, eb.price_max
      )
    END AS item_price,
    eb.price_type AS item_price_type,
    eb.price_min AS item_price_min,
    eb.price_max AS item_price_max,
    eb.commercial_type AS item_commercial_type,
    eb.is_configurable AS item_is_configurable,
    eb.image_url AS item_image_url,
    eb.source_url,
    eb.price_source,
    eb.category_id AS item_category_id,
    eb.category_name AS item_category_name,
    eb.restaurant_id,
    eb.restaurant_name,
    eb.restaurant_category,
    eb.restaurant_neighborhood,
    eb.restaurant_city,
    eb.restaurant_state,
    eb.restaurant_latitude,
    eb.restaurant_longitude,
    eb.restaurant_opening_hours,
    eb.menu_verified_at
  FROM eligible_base AS eb
  WHERE COALESCE(
      eb.promotional_price,
      eb.display_price,
      eb.price_min,
      eb.price,
      eb.price_max
    ) IS NOT NULL
    OR eb.price_type IN ('free', 'included')
),
option_rows AS (
  SELECT
    concat(eb.id::text, ':', mio.id::text) AS result_id,
    'option_variant'::text AS result_kind,
    eb.id AS item_id,
    mio.id AS option_id,
    COALESCE(NULLIF(btrim(mio.search_label), ''), mio.name) AS item_name,
    COALESCE(
      NULLIF(btrim(mio.description), ''),
      concat('Opcao de ', COALESCE(eb.display_name, eb.search_display_name, eb.name))
    ) AS item_description,
    CASE
      WHEN COALESCE(mio.price_behavior, '') = 'price_delta' THEN
        COALESCE(eb.promotional_price, eb.display_price, eb.price_min, eb.price, 0)
          + COALESCE(mio.price_delta, mio.price, 0)
      WHEN COALESCE(mio.price_behavior, '') = 'included' THEN
        COALESCE(eb.promotional_price, eb.display_price, eb.price_min, eb.price, 0)
      ELSE COALESCE(
        mio.price,
        mio.price_delta,
        eb.promotional_price,
        eb.display_price,
        eb.price_min,
        eb.price
      )
    END AS item_price,
    'fixed'::text AS item_price_type,
    CASE
      WHEN COALESCE(mio.price_behavior, '') = 'price_delta' THEN
        COALESCE(eb.promotional_price, eb.display_price, eb.price_min, eb.price, 0)
          + COALESCE(mio.price_delta, mio.price, 0)
      WHEN COALESCE(mio.price_behavior, '') = 'included' THEN
        COALESCE(eb.promotional_price, eb.display_price, eb.price_min, eb.price, 0)
      ELSE COALESCE(mio.price, mio.price_delta, eb.price_min, eb.price)
    END AS item_price_min,
    CASE
      WHEN COALESCE(mio.price_behavior, '') = 'price_delta' THEN
        COALESCE(eb.promotional_price, eb.display_price, eb.price_min, eb.price, 0)
          + COALESCE(mio.price_delta, mio.price, 0)
      WHEN COALESCE(mio.price_behavior, '') = 'included' THEN
        COALESCE(eb.promotional_price, eb.display_price, eb.price_min, eb.price, 0)
      ELSE COALESCE(mio.price, mio.price_delta, eb.price_max, eb.price)
    END AS item_price_max,
    COALESCE(mio.semantic_type, eb.commercial_type, 'option_variant') AS item_commercial_type,
    false AS item_is_configurable,
    eb.image_url AS item_image_url,
    eb.source_url,
    eb.price_source,
    eb.category_id AS item_category_id,
    eb.category_name AS item_category_name,
    eb.restaurant_id,
    eb.restaurant_name,
    eb.restaurant_category,
    eb.restaurant_neighborhood,
    eb.restaurant_city,
    eb.restaurant_state,
    eb.restaurant_latitude,
    eb.restaurant_longitude,
    eb.restaurant_opening_hours,
    eb.menu_verified_at
  FROM eligible_base AS eb
  JOIN public.menu_item_options AS mio ON mio.menu_item_id = eb.id
  WHERE COALESCE(mio.is_available, true)
    AND COALESCE(mio.is_searchable_variant, false)
    AND COALESCE(mio.price, mio.price_delta) IS NOT NULL
)
SELECT * FROM base_rows
UNION ALL
SELECT * FROM option_rows;

COMMENT ON VIEW public.public_catalog_menu_items IS
  'Public item and searchable-option projection. Every row is active, sourced, audited, eligible and published.';

REVOKE ALL PRIVILEGES ON TABLE public.public_catalog_menu_items
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.public_catalog_menu_items TO anon, authenticated, service_role;

-- Public profile/menu projections. Public pages must not join the protected catalog
-- tables directly: those joins would either fail after 0063 or accidentally create a
-- second, weaker publication rule. Every projection below is anchored to the same
-- audited restaurant and item eligibility used by search_public_catalog.
CREATE OR REPLACE VIEW public.public_catalog_menu_sections
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  ms.id,
  ms.restaurant_id,
  ms.name,
  ms.order_index,
  ms.created_at
FROM public.menu_sections AS ms
JOIN public.public_catalog_restaurants AS pcr ON pcr.id = ms.restaurant_id;

CREATE OR REPLACE VIEW public.public_catalog_menu_categories
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  mc.id,
  mc.restaurant_id,
  mc.section_id,
  mc.name,
  mc.order_index,
  true AS is_active,
  false AS is_popular,
  mc.created_at
FROM public.menu_categories AS mc
JOIN public.public_catalog_restaurants AS pcr ON pcr.id = mc.restaurant_id
WHERE COALESCE(mc.is_active, true);

CREATE OR REPLACE VIEW public.public_catalog_menu_entries
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  mi.id,
  mi.category_id,
  mc.restaurant_id,
  mi.name,
  mi.display_name,
  mi.search_display_name,
  mi.description,
  mi.price,
  mi.display_price,
  mi.price_type,
  mi.price_min,
  mi.price_max,
  mi.original_price,
  mi.promotional_price,
  mi.price_source,
  mi.source_url,
  mi.commercial_type,
  mi.is_configurable,
  mi.combo_components,
  mi.combo_rules,
  mi.combo_display_mode,
  mi.serves_count,
  mi.image_url,
  mi.order_index,
  true AS is_active,
  false AS is_illustrative,
  mi.created_at,
  pcr.menu_verified_at
FROM public.menu_items AS mi
JOIN public.public_catalog_menu_categories AS mc ON mc.id = mi.category_id
JOIN public.public_catalog_restaurants AS pcr ON pcr.id = mc.restaurant_id
WHERE COALESCE(mi.is_active, true)
  AND COALESCE(mi.is_public_searchable, true)
  AND COALESCE(mi.is_illustrative, false) = false
  AND COALESCE(mi.needs_review, false) = false
  AND NULLIF(btrim(mi.source_url), '') IS NOT NULL
  AND (
    COALESCE(
      mi.promotional_price,
      mi.display_price,
      mi.price_min,
      mi.price,
      mi.price_max
    ) IS NOT NULL
    OR mi.price_type IN ('free', 'included')
    OR EXISTS (
      SELECT 1
      FROM public.menu_item_options AS mio
      WHERE mio.menu_item_id = mi.id
        AND COALESCE(mio.is_available, true)
        AND COALESCE(mio.is_searchable_variant, false)
        AND COALESCE(mio.price, mio.price_delta) IS NOT NULL
    )
  );

CREATE OR REPLACE VIEW public.public_catalog_menu_option_groups
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  mog.id,
  mog.menu_item_id,
  mog.name,
  mog.min_quantity,
  mog.max_quantity,
  mog.is_required,
  mog.order_index,
  mog.semantic_type,
  mog.price_behavior,
  mog.created_at
FROM public.menu_option_groups AS mog
JOIN public.public_catalog_menu_entries AS pcme ON pcme.id = mog.menu_item_id;

CREATE OR REPLACE VIEW public.public_catalog_menu_item_options
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  mio.id,
  mio.menu_item_id,
  mio.group_id,
  mio.group_name,
  mio.name,
  mio.description,
  mio.price,
  mio.price_delta,
  mio.min_quantity,
  mio.max_quantity,
  mio.is_required,
  true AS is_available,
  mio.order_index,
  mio.semantic_type,
  mio.price_behavior,
  mio.search_label,
  mio.search_aliases,
  mio.created_at
FROM public.menu_item_options AS mio
JOIN public.public_catalog_menu_entries AS pcme ON pcme.id = mio.menu_item_id
WHERE COALESCE(mio.is_available, true);

CREATE OR REPLACE VIEW public.public_catalog_gallery
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  rg.id,
  rg.restaurant_id,
  rg.image_url,
  rg.caption,
  rg.order_index,
  rg.created_at
FROM public.restaurant_gallery AS rg
JOIN public.public_catalog_restaurants AS pcr ON pcr.id = rg.restaurant_id;

COMMENT ON VIEW public.public_catalog_menu_sections IS
  'Public section projection restricted to audited and published restaurant catalogs.';
COMMENT ON VIEW public.public_catalog_menu_categories IS
  'Public active-category projection restricted to audited and published restaurant catalogs.';
COMMENT ON VIEW public.public_catalog_menu_entries IS
  'One safe public row per eligible menu item for profiles and item detail pages.';
COMMENT ON VIEW public.public_catalog_menu_option_groups IS
  'Public option groups belonging only to eligible menu items.';
COMMENT ON VIEW public.public_catalog_menu_item_options IS
  'Public available options belonging only to eligible menu items.';
COMMENT ON VIEW public.public_catalog_gallery IS
  'Public gallery rows belonging only to audited and published restaurant catalogs.';

REVOKE ALL PRIVILEGES ON TABLE
  public.public_catalog_menu_sections,
  public.public_catalog_menu_categories,
  public.public_catalog_menu_entries,
  public.public_catalog_menu_option_groups,
  public.public_catalog_menu_item_options,
  public.public_catalog_gallery
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE
  public.public_catalog_menu_sections,
  public.public_catalog_menu_categories,
  public.public_catalog_menu_entries,
  public.public_catalog_menu_option_groups,
  public.public_catalog_menu_item_options,
  public.public_catalog_gallery
TO anon, authenticated, service_role;

-- Secure replacement for the legacy find_nearby_restaurants RPC. It reads exclusively
-- from public_catalog_restaurants and therefore cannot expose a published-but-unaudited
-- restaurant. Search/category filters are bounded and distance is computed server-side.
CREATE OR REPLACE FUNCTION public.find_public_catalog_restaurants(
  p_lat numeric,
  p_lng numeric,
  p_max_distance_km numeric DEFAULT 10,
  p_search_query text DEFAULT NULL,
  p_included_categories text[] DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  image_url text,
  cover_image_url text,
  plan public.restaurant_plan,
  latitude numeric,
  longitude numeric,
  category text,
  city text,
  state text,
  neighborhood text,
  opening_hours jsonb,
  public_item_count bigint,
  menu_verified_at timestamptz,
  distance_km numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_lat IS NULL OR p_lat < -90 OR p_lat > 90 THEN
    RAISE EXCEPTION 'p_lat must be between -90 and 90' USING ERRCODE = '22023';
  END IF;
  IF p_lng IS NULL OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'p_lng must be between -180 and 180' USING ERRCODE = '22023';
  END IF;
  IF p_max_distance_km IS NULL OR p_max_distance_km < 0.1 OR p_max_distance_km > 50 THEN
    RAISE EXCEPTION 'p_max_distance_km must be between 0.1 and 50' USING ERRCODE = '22023';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 100' USING ERRCODE = '22023';
  END IF;
  IF p_offset IS NULL OR p_offset < 0 OR p_offset > 5000 THEN
    RAISE EXCEPTION 'p_offset must be between 0 and 5000' USING ERRCODE = '22023';
  END IF;
  IF length(COALESCE(p_search_query, '')) > 120 THEN
    RAISE EXCEPTION 'p_search_query must contain at most 120 characters' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(cardinality(p_included_categories), 0) > 20 THEN
    RAISE EXCEPTION 'p_included_categories accepts at most 20 values' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_included_categories, ARRAY[]::text[])) AS category_value
    WHERE length(category_value) > 80
  ) THEN
    RAISE EXCEPTION 'each category must contain at most 80 characters' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      pcr.*,
      (
        2 * 6371.0088 * asin(
          sqrt(LEAST(1::numeric, GREATEST(0::numeric, geo.haversine_a)))
        )
      )::numeric AS computed_distance_km
    FROM public.public_catalog_restaurants AS pcr
    CROSS JOIN LATERAL (
      SELECT
        power(sin(radians(pcr.latitude - p_lat) / 2), 2)
        + cos(radians(p_lat)) * cos(radians(pcr.latitude))
          * power(sin(radians(pcr.longitude - p_lng) / 2), 2) AS haversine_a
    ) AS geo
    WHERE (
      NULLIF(btrim(p_search_query), '') IS NULL
      OR lower(extensions.unaccent(pcr.name)) LIKE '%' || lower(extensions.unaccent(btrim(p_search_query))) || '%'
      OR lower(extensions.unaccent(COALESCE(pcr.category, ''))) LIKE '%' || lower(extensions.unaccent(btrim(p_search_query))) || '%'
      OR lower(extensions.unaccent(COALESCE(pcr.neighborhood, ''))) LIKE '%' || lower(extensions.unaccent(btrim(p_search_query))) || '%'
    )
    AND (
      COALESCE(cardinality(p_included_categories), 0) = 0
      OR EXISTS (
        SELECT 1
        FROM unnest(p_included_categories) AS requested_category
        WHERE lower(extensions.unaccent(btrim(requested_category)))
          = lower(extensions.unaccent(COALESCE(pcr.category, '')))
      )
    )
  )
  SELECT
    c.id,
    c.name,
    c.description,
    c.image_url,
    c.cover_image_url,
    c.plan,
    c.latitude,
    c.longitude,
    c.category,
    c.city,
    c.state,
    c.neighborhood,
    c.opening_hours,
    c.public_item_count,
    c.menu_verified_at,
    c.computed_distance_km
  FROM candidates AS c
  WHERE c.computed_distance_km <= p_max_distance_km
  ORDER BY c.computed_distance_km ASC, c.name ASC, c.id ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.find_public_catalog_restaurants(
  numeric, numeric, numeric, text, text[], integer, integer
) IS
  'Bounded nearby-restaurant query over the audited public catalog projection.';

REVOKE ALL ON FUNCTION public.find_public_catalog_restaurants(
  numeric, numeric, numeric, text, text[], integer, integer
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_public_catalog_restaurants(
  numeric, numeric, numeric, text, text[], integer, integer
) TO anon, authenticated, service_role;

-- One bounded RPC for deterministic recovery and ranking. AI-generated query variants
-- can be supplied in p_queries, but facts always come from the grounded public view.
CREATE OR REPLACE FUNCTION public.search_public_catalog(
  p_queries text[],
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_category text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_neighborhood text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_lat numeric DEFAULT NULL,
  p_lng numeric DEFAULT NULL,
  p_max_distance_km numeric DEFAULT NULL
)
RETURNS TABLE(
  result_id text,
  result_kind text,
  item_id uuid,
  option_id uuid,
  item_name text,
  item_description text,
  item_price numeric,
  item_price_type text,
  item_price_min numeric,
  item_price_max numeric,
  item_commercial_type text,
  item_is_configurable boolean,
  item_image_url text,
  source_url text,
  price_source text,
  item_category_id uuid,
  item_category_name text,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_category text,
  restaurant_neighborhood text,
  restaurant_city text,
  restaurant_state text,
  restaurant_opening_hours jsonb,
  menu_verified_at timestamptz,
  distance_km numeric,
  match_reason text,
  match_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF COALESCE(cardinality(p_queries), 0) > 5 THEN
    RAISE EXCEPTION 'p_queries accepts at most 5 variants' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_queries, ARRAY[]::text[])) AS q(value)
    WHERE length(q.value) > 120
  ) THEN
    RAISE EXCEPTION 'each query variant must contain at most 120 characters' USING ERRCODE = '22023';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 50' USING ERRCODE = '22023';
  END IF;
  IF p_offset IS NULL OR p_offset < 0 OR p_offset > 5000 THEN
    RAISE EXCEPTION 'p_offset must be between 0 and 5000' USING ERRCODE = '22023';
  END IF;
  IF p_min_price IS NOT NULL AND p_min_price < 0 THEN
    RAISE EXCEPTION 'p_min_price cannot be negative' USING ERRCODE = '22023';
  END IF;
  IF p_max_price IS NOT NULL AND p_max_price < 0 THEN
    RAISE EXCEPTION 'p_max_price cannot be negative' USING ERRCODE = '22023';
  END IF;
  IF p_min_price IS NOT NULL AND p_max_price IS NOT NULL AND p_min_price > p_max_price THEN
    RAISE EXCEPTION 'p_min_price cannot exceed p_max_price' USING ERRCODE = '22023';
  END IF;
  IF (p_lat IS NULL) <> (p_lng IS NULL) THEN
    RAISE EXCEPTION 'p_lat and p_lng must be provided together' USING ERRCODE = '22023';
  END IF;
  IF p_lat IS NOT NULL AND (p_lat < -90 OR p_lat > 90) THEN
    RAISE EXCEPTION 'p_lat must be between -90 and 90' USING ERRCODE = '22023';
  END IF;
  IF p_lng IS NOT NULL AND (p_lng < -180 OR p_lng > 180) THEN
    RAISE EXCEPTION 'p_lng must be between -180 and 180' USING ERRCODE = '22023';
  END IF;
  IF p_max_distance_km IS NOT NULL
     AND (p_max_distance_km < 0.1 OR p_max_distance_km > 50) THEN
    RAISE EXCEPTION 'p_max_distance_km must be between 0.1 and 50' USING ERRCODE = '22023';
  END IF;
  IF p_max_distance_km IS NOT NULL AND p_lat IS NULL THEN
    RAISE EXCEPTION 'distance filtering requires p_lat and p_lng' USING ERRCODE = '22023';
  END IF;
  IF length(COALESCE(p_category, '')) > 80
     OR length(COALESCE(p_city, '')) > 100
     OR length(COALESCE(p_state, '')) > 40
     OR length(COALESCE(p_neighborhood, '')) > 100 THEN
    RAISE EXCEPTION 'one or more text filters exceed their maximum length' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH query_variants AS (
    SELECT
      lower(extensions.unaccent(btrim(q.value))) AS query_text,
      q.ordinality::integer AS query_order
    FROM unnest(COALESCE(p_queries, ARRAY[]::text[]))
      WITH ORDINALITY AS q(value, ordinality)
    WHERE NULLIF(btrim(q.value), '') IS NOT NULL
  ),
  effective_queries AS (
    SELECT qv.query_text, qv.query_order
    FROM query_variants AS qv
    UNION ALL
    SELECT ''::text, 1
    WHERE NOT EXISTS (SELECT 1 FROM query_variants)
  ),
  filtered AS (
    SELECT
      pci.*,
      lower(extensions.unaccent(COALESCE(pci.item_name, ''))) AS normalized_item_name,
      lower(extensions.unaccent(COALESCE(pci.item_description, ''))) AS normalized_description,
      lower(extensions.unaccent(COALESCE(pci.item_category_name, ''))) AS normalized_category,
      lower(extensions.unaccent(COALESCE(pci.restaurant_name, ''))) AS normalized_restaurant,
      CASE
        WHEN p_lat IS NULL THEN NULL::numeric
        ELSE (
          2 * 6371.0088 * asin(
            sqrt(LEAST(1::numeric, GREATEST(0::numeric, geo.haversine_a)))
          )
        )::numeric
      END AS computed_distance_km
    FROM public.public_catalog_menu_items AS pci
    CROSS JOIN LATERAL (
      SELECT
        power(sin(radians(pci.restaurant_latitude - p_lat) / 2), 2)
        + cos(radians(p_lat)) * cos(radians(pci.restaurant_latitude))
          * power(sin(radians(pci.restaurant_longitude - p_lng) / 2), 2) AS haversine_a
    ) AS geo
    WHERE (p_min_price IS NULL OR pci.item_price >= p_min_price)
      AND (p_max_price IS NULL OR pci.item_price <= p_max_price)
      AND (
        NULLIF(btrim(p_category), '') IS NULL
        OR lower(extensions.unaccent(pci.item_category_name))
          LIKE '%' || lower(extensions.unaccent(btrim(p_category))) || '%'
      )
      AND (
        NULLIF(btrim(p_city), '') IS NULL
        OR lower(extensions.unaccent(pci.restaurant_city))
          = lower(extensions.unaccent(btrim(p_city)))
      )
      AND (
        NULLIF(btrim(p_state), '') IS NULL
        OR lower(extensions.unaccent(pci.restaurant_state))
          = lower(extensions.unaccent(btrim(p_state)))
      )
      AND (
        NULLIF(btrim(p_neighborhood), '') IS NULL
        OR lower(extensions.unaccent(pci.restaurant_neighborhood))
          = lower(extensions.unaccent(btrim(p_neighborhood)))
      )
  ),
  matched AS (
    SELECT
      f.*,
      eq.query_order,
      CASE
        WHEN eq.query_text = '' THEN 10
        WHEN f.normalized_item_name = eq.query_text THEN 1000
        WHEN f.normalized_item_name LIKE eq.query_text || '%' THEN 800
        WHEN f.normalized_item_name LIKE '%' || eq.query_text || '%' THEN 650
        WHEN f.normalized_category LIKE '%' || eq.query_text || '%' THEN 400
        WHEN f.normalized_description LIKE '%' || eq.query_text || '%' THEN 300
        WHEN f.normalized_restaurant LIKE '%' || eq.query_text || '%' THEN 200
        ELSE 0
      END - ((eq.query_order - 1) * 5) AS raw_match_score,
      CASE
        WHEN eq.query_text = '' THEN 'catalog_featured'
        WHEN f.normalized_item_name = eq.query_text THEN 'exact_item_name'
        WHEN f.normalized_item_name LIKE eq.query_text || '%' THEN 'item_name_prefix'
        WHEN f.normalized_item_name LIKE '%' || eq.query_text || '%' THEN 'item_name'
        WHEN f.normalized_category LIKE '%' || eq.query_text || '%' THEN 'category'
        WHEN f.normalized_description LIKE '%' || eq.query_text || '%' THEN 'description'
        WHEN f.normalized_restaurant LIKE '%' || eq.query_text || '%' THEN 'restaurant'
        ELSE 'no_match'
      END AS raw_match_reason
    FROM filtered AS f
    CROSS JOIN effective_queries AS eq
    WHERE eq.query_text = ''
       OR f.normalized_item_name LIKE '%' || eq.query_text || '%'
       OR f.normalized_category LIKE '%' || eq.query_text || '%'
       OR f.normalized_description LIKE '%' || eq.query_text || '%'
       OR f.normalized_restaurant LIKE '%' || eq.query_text || '%'
  ),
  best_match AS (
    SELECT DISTINCT ON (m.result_id)
      m.*
    FROM matched AS m
    WHERE p_max_distance_km IS NULL
       OR m.computed_distance_km <= p_max_distance_km
    ORDER BY m.result_id, m.raw_match_score DESC, m.query_order ASC
  )
  SELECT
    bm.result_id,
    bm.result_kind,
    bm.item_id,
    bm.option_id,
    bm.item_name,
    bm.item_description,
    bm.item_price,
    bm.item_price_type,
    bm.item_price_min,
    bm.item_price_max,
    bm.item_commercial_type,
    bm.item_is_configurable,
    bm.item_image_url,
    bm.source_url,
    bm.price_source,
    bm.item_category_id,
    bm.item_category_name,
    bm.restaurant_id,
    bm.restaurant_name,
    bm.restaurant_category,
    bm.restaurant_neighborhood,
    bm.restaurant_city,
    bm.restaurant_state,
    bm.restaurant_opening_hours,
    bm.menu_verified_at,
    bm.computed_distance_km,
    bm.raw_match_reason,
    bm.raw_match_score::numeric
  FROM best_match AS bm
  ORDER BY
    bm.raw_match_score DESC,
    bm.computed_distance_km ASC NULLS LAST,
    bm.menu_verified_at DESC,
    bm.result_id ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.search_public_catalog(
  text[], integer, integer, text, text, text, text,
  numeric, numeric, numeric, numeric, numeric
) IS
  'Bounded deterministic public search. Query variants affect retrieval only; every fact comes from the eligible catalog projection.';

REVOKE ALL ON FUNCTION public.search_public_catalog(
  text[], integer, integer, text, text, text, text,
  numeric, numeric, numeric, numeric, numeric
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_catalog(
  text[], integer, integer, text, text, text, text,
  numeric, numeric, numeric, numeric, numeric
) TO anon, authenticated, service_role;

-- Public coverage is derived from the same eligible projections, so UI copy can distinguish
-- a zero-result query from a genuinely unsupported location without exposing candidates.
CREATE OR REPLACE FUNCTION public.get_public_catalog_coverage(
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_neighborhood text DEFAULT NULL,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  city text,
  state text,
  neighborhood text,
  restaurant_count bigint,
  menu_item_count bigint,
  searchable_result_count bigint,
  last_verified_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 500' USING ERRCODE = '22023';
  END IF;
  IF length(COALESCE(p_city, '')) > 100
     OR length(COALESCE(p_state, '')) > 40
     OR length(COALESCE(p_neighborhood, '')) > 100 THEN
    RAISE EXCEPTION 'one or more coverage filters exceed their maximum length' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH item_counts AS (
    SELECT
      pci.restaurant_id,
      count(DISTINCT pci.item_id)::bigint AS menu_item_count,
      count(*)::bigint AS searchable_result_count
    FROM public.public_catalog_menu_items AS pci
    GROUP BY pci.restaurant_id
  )
  SELECT
    pcr.city,
    pcr.state,
    pcr.neighborhood,
    count(DISTINCT pcr.id)::bigint AS restaurant_count,
    COALESCE(sum(ic.menu_item_count), 0)::bigint AS menu_item_count,
    COALESCE(sum(ic.searchable_result_count), 0)::bigint AS searchable_result_count,
    max(pcr.menu_verified_at) AS last_verified_at
  FROM public.public_catalog_restaurants AS pcr
  LEFT JOIN item_counts AS ic ON ic.restaurant_id = pcr.id
  WHERE (
      NULLIF(btrim(p_city), '') IS NULL
      OR lower(extensions.unaccent(pcr.city))
        = lower(extensions.unaccent(btrim(p_city)))
    )
    AND (
      NULLIF(btrim(p_state), '') IS NULL
      OR lower(extensions.unaccent(pcr.state))
        = lower(extensions.unaccent(btrim(p_state)))
    )
    AND (
      NULLIF(btrim(p_neighborhood), '') IS NULL
      OR lower(extensions.unaccent(pcr.neighborhood))
        = lower(extensions.unaccent(btrim(p_neighborhood)))
    )
  GROUP BY pcr.city, pcr.state, pcr.neighborhood
  ORDER BY count(DISTINCT pcr.id) DESC, pcr.city, pcr.neighborhood
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_public_catalog_coverage(text, text, text, integer) IS
  'Public coverage grouped by location, calculated only from audited and published catalog rows.';

REVOKE ALL ON FUNCTION public.get_public_catalog_coverage(text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_catalog_coverage(text, text, text, integer)
  TO anon, authenticated, service_role;

-- Legacy RPCs filter only is_published and therefore do not satisfy the new eligibility
-- contract. Keep them available to service workers, but remove browser execution so they
-- cannot bypass the safe projections.
REVOKE EXECUTE ON FUNCTION public.search_menu_items(text, integer, integer, uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_menu_items(text, integer, integer, uuid[])
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.find_nearby_restaurants(
  numeric, numeric, numeric, text, text[], integer, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_nearby_restaurants(
  numeric, numeric, numeric, text, text[], integer, integer
) TO service_role;

COMMIT;
