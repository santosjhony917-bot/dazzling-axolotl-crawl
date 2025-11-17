CREATE OR REPLACE FUNCTION public.search_menu_items(search_query text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, excluded_category_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(item_id uuid, item_name text, item_description text, item_price numeric, item_image_url text, restaurant_id uuid, restaurant_name text, restaurant_category text, item_category_id uuid, item_category_name text)
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
$function$