-- Migration: Filter Deleted Restaurants from Public Search/List SQL functions
-- Re-creates find_nearby_restaurants and search_menu_items to exclude soft-deleted restaurants (is_deleted = true)

-- 1. Recria a função find_nearby_restaurants utilizando a geometria do PostGIS para maior performance e filtrando deletados
CREATE OR REPLACE FUNCTION public.find_nearby_restaurants(
  user_lat numeric, 
  user_lng numeric, 
  max_distance_km numeric DEFAULT 10, 
  search_query text DEFAULT NULL::text, 
  included_categories text[] DEFAULT NULL::text[], 
  p_limit integer DEFAULT 50, 
  p_offset integer DEFAULT 0
)
 RETURNS TABLE(
   id uuid, 
   user_id uuid, 
   name text, 
   description text, 
   image_url text, 
   cover_image_url text, 
   plan public.restaurant_plan, 
   created_at timestamp with time zone, 
   latitude numeric, 
   longitude numeric, 
   category text, 
   city text, 
   state text, 
   neighborhood text, 
   distance_km numeric
 )
 LANGUAGE sql
AS $function$
SELECT
    r.id,
    r.user_id,
    r.name,
    r.description,
    r.image_url,
    r.cover_image_url,
    r.plan,
    r.created_at,
    r.latitude,
    r.longitude,
    r.category,
    r.city,
    r.state,
    r.neighborhood,
    (ST_Distance(r.geom, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) / 1000.0)::numeric AS distance_km
FROM
    public.restaurants r
WHERE
    r.geom IS NOT NULL
    AND r.visit_status = 'Visitado'::public.visit_status_enum
    AND (r.is_deleted = false OR r.is_deleted IS NULL)
    AND ST_DWithin(r.geom, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, max_distance_km * 1000.0)
    AND (
        search_query IS NULL
        OR r.name ILIKE '%' || search_query || '%'
        OR r.category ILIKE '%' || search_query || '%'
    )
    AND (
        included_categories IS NULL
        OR array_length(included_categories, 1) IS NULL
        OR r.category = ANY(included_categories)
    )
ORDER BY
    CASE r.plan
        WHEN 'premium' THEN 1
        WHEN 'premium_gift' THEN 2
        ELSE 3
    END,
    distance_km ASC
LIMIT p_limit OFFSET p_offset;
$function$;

-- 2. Recria a função search_menu_items para retornar apenas os itens de restaurantes com visit_status = 'Visitado' e não deletados
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
   item_image_url text, 
   restaurant_id uuid, 
   restaurant_name text, 
   restaurant_category text, 
   item_category_id uuid, 
   item_category_name text
 )
 LANGUAGE sql
AS $function$
SELECT
    mi.id AS item_id,
    mi.name AS item_name,
    mi.description AS item_description,
    mi.price AS item_price,
    mi.image_url AS item_image_url,
    r.id AS restaurant_id,
    r.name AS restaurant_name,
    r.category AS restaurant_category,
    mc.id AS item_category_id,
    mc.name AS item_category_name
FROM
    public.menu_items mi
JOIN
    public.menu_categories mc ON mi.category_id = mc.id
JOIN
    public.restaurants r ON mc.restaurant_id = r.id
WHERE
    mi.is_active = TRUE
    AND mc.is_active = TRUE
    AND r.visit_status = 'Visitado'::public.visit_status_enum
    AND (r.is_deleted = FALSE OR r.is_deleted IS NULL)
    AND (
        search_query IS NULL
        OR mi.name ILIKE '%' || search_query || '%'
        OR mi.description ILIKE '%' || search_query || '%'
    )
    AND (
        excluded_category_ids IS NULL
        OR NOT (mc.id = ANY(excluded_category_ids))
    )
ORDER BY
    r.plan DESC, mi.order_index ASC
LIMIT p_limit OFFSET p_offset;
$function$;
