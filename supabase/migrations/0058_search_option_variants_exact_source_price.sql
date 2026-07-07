-- Mantem o cardapio copiado da fonte oficial como produto + grupos/opcoes,
-- mas exibe variantes pesquisaveis com nome publico e preco final corretos.
-- Ex.: "Pizza Grande | 8 Fatias" + sabor "Toscana" (+6) aparece na busca como
-- "Pizza Grande | 8 Fatias - Toscana" por preco base + acrescimo.

UPDATE public.menu_item_options AS mio
SET search_label = CASE
  WHEN lower(extensions.unaccent(COALESCE(mi.display_name, mi.search_display_name, mi.name, '')))
       LIKE '%' || lower(extensions.unaccent(NULLIF(
         btrim(regexp_replace(
           regexp_replace(mio.name, '^\s*(?:[0-9]+\s*/\s*[0-9]+|1/2|meia|meio)\s*', '', 'i'),
           '^\s*(?:add|adc|adicional)\s+',
           '',
           'i'
         )),
         ''
       ))) || '%'
    THEN COALESCE(mi.display_name, mi.search_display_name, mi.name)
  ELSE btrim(regexp_replace(
    concat_ws(
      ' - ',
      COALESCE(mi.display_name, mi.search_display_name, mi.name),
      NULLIF(
        btrim(regexp_replace(
          regexp_replace(mio.name, '^\s*(?:[0-9]+\s*/\s*[0-9]+|1/2|meia|meio)\s*', '', 'i'),
          '^\s*(?:add|adc|adicional)\s+',
          '',
          'i'
        )),
        ''
      )
    ),
    '\s+',
    ' ',
    'g'
  ))
END
FROM public.menu_items AS mi
WHERE mio.menu_item_id = mi.id
  AND mio.is_searchable_variant = TRUE
  AND (
    mio.search_label IS NULL
    OR btrim(mio.search_label) = ''
    OR mio.search_label NOT LIKE '% - %'
  );

DROP FUNCTION IF EXISTS public.search_menu_items(text, integer, integer, uuid[]);

CREATE OR REPLACE FUNCTION public.search_menu_items(
  search_query text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  excluded_category_ids uuid[] DEFAULT NULL::uuid[]
)
 RETURNS TABLE(
   item_id uuid,
   item_name text,
   item_description text,
   item_price numeric,
   item_price_type text,
   item_display_price numeric,
   item_price_min numeric,
   item_price_max numeric,
   item_commercial_type text,
   item_is_configurable boolean,
   item_image_url text,
   restaurant_id uuid,
   restaurant_name text,
   restaurant_category text,
   item_category_id uuid,
   item_category_name text,
   restaurant_neighborhood text,
   restaurant_opening_hours jsonb
 )
 LANGUAGE sql
 AS $function$
 WITH query_terms AS (
   SELECT ARRAY(
     SELECT term
     FROM regexp_split_to_table(
       lower(extensions.unaccent(COALESCE(search_query, ''))),
       '[^a-z0-9]+'
     ) AS term
     WHERE length(term) >= 3
       AND term NOT IN ('com', 'sem', 'para', 'uma', 'das', 'dos', 'por')
   ) AS terms
 ),
 base_matches AS (
   SELECT
       mi.id AS item_id,
       COALESCE(mi.display_name, mi.search_display_name, mi.name) AS item_name,
       mi.description AS item_description,
       COALESCE(mi.display_price, mi.price_min, mi.price) AS item_price,
       mi.price_type AS item_price_type,
       mi.display_price AS item_display_price,
       mi.price_min AS item_price_min,
       mi.price_max AS item_price_max,
       mi.commercial_type AS item_commercial_type,
       mi.is_configurable AS item_is_configurable,
       mi.image_url AS item_image_url,
       r.id AS restaurant_id,
       r.name AS restaurant_name,
       r.category AS restaurant_category,
       mc.id AS item_category_id,
       mc.name AS item_category_name,
       r.neighborhood AS restaurant_neighborhood,
       r.opening_hours AS restaurant_opening_hours,
       3 AS match_rank,
       mi.order_index AS order_index
   FROM public.menu_items mi
   JOIN public.menu_categories mc ON mi.category_id = mc.id
   JOIN public.restaurants r ON mc.restaurant_id = r.id
   WHERE
       mi.is_active = TRUE
       AND mc.is_active = TRUE
       AND r.is_published = TRUE
       AND (r.is_deleted = FALSE OR r.is_deleted IS NULL)
       AND COALESCE(mi.is_public_searchable, TRUE) = TRUE
       AND (
           search_query IS NULL
           OR TRIM(search_query) = ''
           OR mi.name ILIKE '%' || search_query || '%'
           OR mi.display_name ILIKE '%' || search_query || '%'
           OR mi.search_display_name ILIKE '%' || search_query || '%'
           OR mi.search_keywords ILIKE '%' || search_query || '%'
           OR mi.description ILIKE '%' || search_query || '%'
       )
       AND (
           excluded_category_ids IS NULL
           OR NOT (mc.id = ANY(excluded_category_ids))
       )
 ),
 option_matches AS (
   SELECT
       mi.id AS item_id,
       COALESCE(mio.search_label, mio.name) AS item_name,
       CASE
         WHEN COALESCE(mio.price_behavior, '') = 'price_delta' THEN
           CONCAT('Opcao de ', COALESCE(mi.display_name, mi.search_display_name, mi.name), ' + ', mio.name)
         ELSE
           CONCAT('Opcao de ', COALESCE(mi.display_name, mi.search_display_name, mi.name), ' - ', COALESCE(mio.group_name, 'Opcoes'))
       END AS item_description,
       CASE
         WHEN COALESCE(mio.price_behavior, '') = 'price_delta' THEN
           COALESCE(mi.display_price, mi.price_min, mi.price, 0) + COALESCE(mio.price_delta, mio.price, 0)
         WHEN COALESCE(mio.price_behavior, '') = 'included' THEN
           COALESCE(mi.display_price, mi.price_min, mi.price, 0)
         ELSE
           COALESCE(mio.price, mio.price_delta, mi.display_price, mi.price_min, mi.price)
       END AS item_price,
       'fixed'::text AS item_price_type,
       CASE
         WHEN COALESCE(mio.price_behavior, '') = 'price_delta' THEN
           COALESCE(mi.display_price, mi.price_min, mi.price, 0) + COALESCE(mio.price_delta, mio.price, 0)
         WHEN COALESCE(mio.price_behavior, '') = 'included' THEN
           COALESCE(mi.display_price, mi.price_min, mi.price, 0)
         ELSE
           COALESCE(mio.price, mio.price_delta, mi.display_price, mi.price_min, mi.price)
       END AS item_display_price,
       CASE
         WHEN COALESCE(mio.price_behavior, '') = 'price_delta' THEN
           COALESCE(mi.display_price, mi.price_min, mi.price, 0) + COALESCE(mio.price_delta, mio.price, 0)
         WHEN COALESCE(mio.price_behavior, '') = 'included' THEN
           COALESCE(mi.display_price, mi.price_min, mi.price, 0)
         ELSE
           COALESCE(mio.price, mio.price_delta, mi.price_min, mi.price)
       END AS item_price_min,
       CASE
         WHEN COALESCE(mio.price_behavior, '') = 'price_delta' THEN
           COALESCE(mi.display_price, mi.price_min, mi.price, 0) + COALESCE(mio.price_delta, mio.price, 0)
         WHEN COALESCE(mio.price_behavior, '') = 'included' THEN
           COALESCE(mi.display_price, mi.price_min, mi.price, 0)
         ELSE
           COALESCE(mio.price, mio.price_delta, mi.price_max, mi.price)
       END AS item_price_max,
       COALESCE(mio.semantic_type, 'option_variant') AS item_commercial_type,
       FALSE AS item_is_configurable,
       COALESCE(NULLIF(mio.image_url, ''), mi.image_url) AS item_image_url,
       r.id AS restaurant_id,
       r.name AS restaurant_name,
       r.category AS restaurant_category,
       mc.id AS item_category_id,
       mc.name AS item_category_name,
       r.neighborhood AS restaurant_neighborhood,
       r.opening_hours AS restaurant_opening_hours,
       1 AS match_rank,
       mi.order_index AS order_index
   FROM public.menu_item_options mio
   JOIN public.menu_items mi ON mio.menu_item_id = mi.id
   JOIN public.menu_categories mc ON mi.category_id = mc.id
   JOIN public.restaurants r ON mc.restaurant_id = r.id
   CROSS JOIN query_terms qt
   CROSS JOIN LATERAL (
     SELECT lower(extensions.unaccent(CONCAT_WS(' ', mio.search_label, mio.search_aliases, mio.name, mio.group_name, mi.name, mi.display_name, mc.name))) AS search_blob
   ) sb
   WHERE
       search_query IS NOT NULL
       AND TRIM(search_query) <> ''
       AND array_length(qt.terms, 1) IS NOT NULL
       AND mi.is_active = TRUE
       AND mc.is_active = TRUE
       AND r.is_published = TRUE
       AND (r.is_deleted = FALSE OR r.is_deleted IS NULL)
       AND COALESCE(mi.is_public_searchable, TRUE) = TRUE
       AND mio.is_available = TRUE
       AND mio.is_searchable_variant = TRUE
       AND COALESCE(mio.price, mio.price_delta, mi.display_price, mi.price_min, mi.price) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM unnest(qt.terms) term
         WHERE sb.search_blob NOT LIKE '%' || term || '%'
       )
       AND (
           excluded_category_ids IS NULL
           OR NOT (mc.id = ANY(excluded_category_ids))
       )
 )
 SELECT
   item_id,
   item_name,
   item_description,
   item_price,
   item_price_type,
   item_display_price,
   item_price_min,
   item_price_max,
   item_commercial_type,
   item_is_configurable,
   item_image_url,
   restaurant_id,
   restaurant_name,
   restaurant_category,
   item_category_id,
   item_category_name,
   restaurant_neighborhood,
   restaurant_opening_hours
 FROM (
   SELECT * FROM option_matches
   UNION ALL
   SELECT * FROM base_matches
 ) results
 ORDER BY
     match_rank ASC,
     (item_image_url IS NOT NULL AND item_image_url <> '' AND item_image_url <> 'PLACEHOLDER_IMAGE_URL') DESC,
     order_index ASC
 LIMIT p_limit OFFSET p_offset;
 $function$;
