-- Migration: Database Optimizations (PostGIS, Indexes, Full-Text Search)

-- 1. Habilita a extensão PostGIS se não estiver ativa
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Adiciona a coluna geom (geography Point) na tabela de restaurantes
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS geom geography(Point, 4326);

-- 3. Cria a função de trigger para atualizar geom automaticamente a partir de latitude/longitude
CREATE OR REPLACE FUNCTION public.update_restaurant_geom()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Cria o trigger before insert or update na tabela restaurants
CREATE OR REPLACE TRIGGER trg_update_restaurant_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.update_restaurant_geom();

-- 5. Atualiza os registros existentes com a nova geometria
UPDATE public.restaurants 
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 6. Cria o índice espacial (GIST) para consultas geográficas eficientes
CREATE INDEX IF NOT EXISTS idx_restaurants_geom ON public.restaurants USING gist(geom);

-- 7. Cria índices B-tree para otimizar JOINs e filtros comuns
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON public.menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_visit_status ON public.restaurants(visit_status) WHERE visit_status = 'Visitado';
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON public.restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants(category);

-- 8. Cria o índice GIN de Full-Text Search em português para busca por nome de restaurante
CREATE INDEX IF NOT EXISTS idx_restaurants_name_fts ON public.restaurants USING gin(to_tsvector('portuguese', name));

-- 9. Recria a função find_nearby_restaurants utilizando a geometria do PostGIS para maior performance
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
