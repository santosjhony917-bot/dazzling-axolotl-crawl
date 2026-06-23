-- A busca precisa saber se o preço é fixo ou "a partir de".
-- Sem estes metadados, o app recebe apenas o número e pode exibir um item configurável como preço final.

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
     r.opening_hours AS restaurant_opening_hours
 FROM
     public.menu_items mi
 JOIN
     public.menu_categories mc ON mi.category_id = mc.id
 JOIN
     public.restaurants r ON mc.restaurant_id = r.id
 WHERE
     mi.is_active = TRUE
     AND mc.is_active = TRUE
     AND r.is_published = TRUE
     AND (r.is_deleted = FALSE OR r.is_deleted IS NULL)
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
     AND (
         (search_query IS NOT NULL AND TRIM(search_query) <> '')
         OR (
             mc.name NOT ILIKE '%bebida%'
             AND mc.name NOT ILIKE '%adicional%'
             AND mc.name NOT ILIKE '%bomboniere%'
             AND mc.name NOT ILIKE '%doce%'
             AND mc.name NOT ILIKE '%chocolate%'
             AND mc.name NOT ILIKE '%refrigerante%'
             AND mc.name NOT ILIKE '%cerveja%'
             AND mc.name NOT ILIKE '%acréscimo%'
             AND mc.name NOT ILIKE '%suplemento%'
             AND mc.name NOT ILIKE '%extra%'
             AND mc.name NOT ILIKE '%copo%'
             AND mc.name NOT ILIKE '%combo%'
         )
     )
 ORDER BY
     (mi.image_url IS NOT NULL AND mi.image_url <> '' AND mi.image_url <> 'PLACEHOLDER_IMAGE_URL') DESC,
     r.plan DESC,
     mi.order_index ASC
 LIMIT p_limit OFFSET p_offset;
 $function$;
