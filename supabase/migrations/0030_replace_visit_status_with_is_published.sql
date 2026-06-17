-- Migration 0030: Replace visit_status with is_published
-- Removes the concept of "Visitas" and replaces it with a simple "Published" flag

-- 1. Add new column is_published
ALTER TABLE public.restaurants 
ADD COLUMN is_published BOOLEAN DEFAULT FALSE;

-- 2. Migrate data
UPDATE public.restaurants 
SET is_published = TRUE 
WHERE visit_status = 'Visitado';

-- 3. Update Indexes (Replacing the old visit_status index)
DROP INDEX IF EXISTS idx_restaurants_visit_status;
CREATE INDEX IF NOT EXISTS idx_restaurants_is_published ON public.restaurants(is_published) WHERE is_published = TRUE;

-- 4. Drop dependent functions before dropping the column and type
DROP FUNCTION IF EXISTS public.search_menu_items(text, integer, integer, uuid[]);
DROP FUNCTION IF EXISTS public.find_nearby_restaurants(numeric, numeric, numeric, text, text[], integer, integer);

-- 5. Drop the column and enum
ALTER TABLE public.restaurants DROP COLUMN visit_status;
DROP TYPE IF EXISTS public.visit_status_enum CASCADE;

-- 6. Recreate search_menu_items
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
   item_category_name text,
   restaurant_neighborhood text,
   restaurant_opening_hours jsonb
 )
 LANGUAGE sql
 AS $function$
 SELECT
     mi.id AS item_id,
     COALESCE(mi.search_display_name, mi.name) AS item_name,
     mi.description AS item_description,
     mi.price AS item_price,
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
         OR mi.name ILIKE '%' || search_query || '%'
         OR mi.search_display_name ILIKE '%' || search_query || '%'
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

-- 7. Recreate find_nearby_restaurants
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
    AND r.is_published = TRUE
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
