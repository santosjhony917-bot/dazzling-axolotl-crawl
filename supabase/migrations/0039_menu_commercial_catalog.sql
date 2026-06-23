-- Modelo comercial para cardápios coletados por IA/robô.
-- Objetivo: preservar o item como o restaurante venderia/editária:
-- produto base + grupos de escolhas/adicionais + preço de exibição para busca.

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS display_price numeric,
  ADD COLUMN IF NOT EXISTS commercial_type text,
  ADD COLUMN IF NOT EXISTS is_configurable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS search_keywords text,
  ADD COLUMN IF NOT EXISTS import_notes text;

CREATE INDEX IF NOT EXISTS idx_menu_items_commercial_type
  ON public.menu_items(commercial_type) WHERE commercial_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_menu_items_search_keywords
  ON public.menu_items USING gin(to_tsvector('portuguese', COALESCE(search_keywords, '')));

CREATE TABLE IF NOT EXISTS public.menu_option_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  external_id text,
  name text NOT NULL,
  min_quantity integer NOT NULL DEFAULT 0,
  max_quantity integer,
  is_required boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_option_groups_item
  ON public.menu_option_groups(menu_item_id, order_index);

ALTER TABLE public.menu_item_options
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.menu_option_groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_menu_item_options_group
  ON public.menu_item_options(group_id) WHERE group_id IS NOT NULL;

ALTER TABLE public.menu_option_groups DISABLE ROW LEVEL SECURITY;

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
