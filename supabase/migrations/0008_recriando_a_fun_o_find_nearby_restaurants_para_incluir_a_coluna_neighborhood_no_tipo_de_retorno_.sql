CREATE OR REPLACE FUNCTION public.find_nearby_restaurants(user_lat numeric, user_lng numeric, max_distance_km numeric DEFAULT 10, search_query text DEFAULT NULL::text, included_categories text[] DEFAULT NULL::text[])
 RETURNS TABLE(id uuid, user_id uuid, name text, description text, image_url text, cover_image_url text, plan restaurant_plan, created_at timestamp with time zone, latitude numeric, longitude numeric, category text, city text, state text, neighborhood text, distance_km numeric)
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
    r.neighborhood, -- Adicionado o bairro aqui
    public.calculate_distance(user_lat, user_lng, r.latitude, r.longitude) AS distance_km
FROM
    public.restaurants r
WHERE
    r.latitude IS NOT NULL
    AND r.longitude IS NOT NULL
    AND public.calculate_distance(user_lat, user_lng, r.latitude, r.longitude) <= max_distance_km
    AND (
        search_query IS NULL
        OR r.name ILIKE '%' || search_query || '%'
        OR r.category ILIKE '%' || search_query || '%'
    )
    AND (
        included_categories IS NULL
        OR array_length(included_categories, 1) IS NULL -- Handle empty array case
        OR r.category = ANY(included_categories)
    )
ORDER BY
    CASE r.plan
        WHEN 'premium' THEN 1
        WHEN 'basic' THEN 2
        ELSE 3
    END,
    distance_km ASC
LIMIT 50;
$function$