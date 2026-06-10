-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. ENUMS AND TYPES
CREATE TYPE public.restaurant_plan AS ENUM ('free', 'premium', 'premium_gift');
CREATE TYPE public.visit_status_enum AS ENUM ('Pendente', 'Visitado', 'Agendado', 'Contatado', 'Interessado', 'Não Interessado', 'Não Localizado');

-- 2. TABLES
-- Table profiles
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name text,
  last_name text,
  avatar_url text,
  updated_at timestamp with time zone DEFAULT now()
);

-- Table restaurants
CREATE TABLE public.restaurants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  image_url text,
  cover_image_url text,
  plan public.restaurant_plan DEFAULT 'free'::public.restaurant_plan NOT NULL,
  phone text,
  email text,
  cnpj text,
  category text,
  whatsapp_url text,
  ifood_url text,
  other_url text UNIQUE,
  address text,
  number text,
  neighborhood text,
  city text,
  state text,
  cep text,
  latitude numeric,
  longitude numeric,
  opening_hours jsonb,
  created_at timestamp with time zone DEFAULT now(),
  external_url text UNIQUE,
  followers_override integer,
  payment_methods jsonb,
  social_networks jsonb,
  other_url_label text,
  claim_code text UNIQUE,
  visit_status public.visit_status_enum DEFAULT 'Pendente'::public.visit_status_enum,
  visit_notes text,
  geom geography(Point, 4326)
);

-- Table menu_categories
CREATE TABLE public.menu_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  is_popular boolean DEFAULT false
);

-- Table menu_items
CREATE TABLE public.menu_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES public.menu_categories(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Table restaurant_gallery
CREATE TABLE public.restaurant_gallery (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  caption text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Table user_favorites
CREATE TABLE public.user_favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_favorites_user_id_restaurant_id_key UNIQUE(user_id, restaurant_id)
);

-- Table user_search_locations
CREATE TABLE public.user_search_locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  address text NOT NULL,
  cep text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. FUNCTIONS & PROCEDURES

-- Function is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR coalesce(auth.jwt() ->> 'email', '') = 'joaoedasilva018@gmail.com'
  );
END;
$$;

-- Function is_category_owner()
CREATE OR REPLACE FUNCTION public.is_category_owner(p_category_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.menu_categories mc
    JOIN public.restaurants r ON mc.restaurant_id = r.id
    WHERE mc.id = p_category_id AND r.user_id = auth.uid()
  );
END;
$$;

-- Function calculate_distance()
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 numeric,
  lng1 numeric,
  lat2 numeric,
  lng2 numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r numeric := 6371; -- Earth's radius in kilometers
  dlat numeric;
  dlng numeric;
  a numeric;
  c numeric;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  
  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlng/2) * sin(dlng/2);
  c := 2 * asin(sqrt(a));
  
  RETURN r * c;
END;
$$;

-- Function update_restaurant_geom()
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

-- Function find_nearby_restaurants()
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

-- Function search_menu_items()
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

-- Function generate_restaurant_claim_code()
CREATE OR REPLACE FUNCTION public.generate_restaurant_claim_code()
RETURNS text AS $$
DECLARE
  new_code TEXT;
  is_unique BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character uppercase alphanumeric string.
    new_code := (
        SELECT string_agg(c, '')
        FROM (
            SELECT substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', (floor(random() * 36) + 1)::integer, 1)
            FROM generate_series(1, 8)
        ) AS sub(c)
    );
    -- Check if the generated code already exists.
    SELECT NOT EXISTS(SELECT 1 FROM public.restaurants WHERE claim_code = new_code) INTO is_unique;
    -- If it's unique, exit the loop.
    IF is_unique THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function set_restaurant_claim_code()
CREATE OR REPLACE FUNCTION public.set_restaurant_claim_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.claim_code IS NULL THEN
    NEW.claim_code := public.generate_restaurant_claim_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, avatar_url, updated_at)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. TRIGGERS
-- Trigger on restaurants to generate claim code
CREATE OR REPLACE TRIGGER before_insert_set_claim_code
BEFORE INSERT ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.set_restaurant_claim_code();

-- Trigger on restaurants to update geom geography Point automatically
CREATE OR REPLACE TRIGGER trg_update_restaurant_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.update_restaurant_geom();

-- Trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 5. ROW LEVEL SECURITY (RLS) POLICIES

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- restaurants
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurants are viewable by everyone"
  ON public.restaurants FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own restaurant"
  ON public.restaurants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Owners and Admins can update restaurants"
  ON public.restaurants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can delete any restaurant"
  ON public.restaurants FOR DELETE TO authenticated
  USING (public.is_admin());

-- menu_categories
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Menu categories are viewable by everyone"
  ON public.menu_categories FOR SELECT
  USING (true);

CREATE POLICY "Owners and Admins can insert menu categories"
  ON public.menu_categories FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.restaurants WHERE id = restaurant_id)
    OR public.is_admin()
  );

CREATE POLICY "Owners and Admins can update menu categories"
  ON public.menu_categories FOR UPDATE TO authenticated
  USING (
    auth.uid() = (SELECT user_id FROM public.restaurants WHERE id = restaurant_id)
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.restaurants WHERE id = restaurant_id)
    OR public.is_admin()
  );

CREATE POLICY "Owners and Admins can delete menu categories"
  ON public.menu_categories FOR DELETE TO authenticated
  USING (
    auth.uid() = (SELECT user_id FROM public.restaurants WHERE id = restaurant_id)
    OR public.is_admin()
  );

-- menu_items
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Menu items are viewable by everyone"
  ON public.menu_items FOR SELECT
  USING (true);

CREATE POLICY "Owners and Admins can insert menu items"
  ON public.menu_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_categories mc
      JOIN public.restaurants r ON mc.restaurant_id = r.id
      WHERE mc.id = category_id AND (r.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Owners and Admins can update menu items"
  ON public.menu_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_categories mc
      JOIN public.restaurants r ON mc.restaurant_id = r.id
      WHERE mc.id = category_id AND (r.user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_categories mc
      JOIN public.restaurants r ON mc.restaurant_id = r.id
      WHERE mc.id = category_id AND (r.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Owners and Admins can delete menu items"
  ON public.menu_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_categories mc
      JOIN public.restaurants r ON mc.restaurant_id = r.id
      WHERE mc.id = category_id AND (r.user_id = auth.uid() OR public.is_admin())
    )
  );

-- restaurant_gallery
ALTER TABLE public.restaurant_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gallery images are viewable by everyone"
  ON public.restaurant_gallery FOR SELECT
  USING (true);

CREATE POLICY "Owners and Admins can manage gallery"
  ON public.restaurant_gallery FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id AND (r.user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id AND (r.user_id = auth.uid() OR public.is_admin())
    )
  );

-- user_favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites"
  ON public.user_favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_search_locations
ALTER TABLE public.user_search_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own search locations"
  ON public.user_search_locations FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. INDEXES
-- Spatial Index for geolocated searches
CREATE INDEX IF NOT EXISTS idx_restaurants_geom ON public.restaurants USING gist(geom);

-- B-Tree Indexes for Foreign Keys and frequent filter fields
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON public.menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_visit_status ON public.restaurants(visit_status) WHERE visit_status = 'Visitado';
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON public.restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants(category);

-- GIN Index for Full-Text Search in Portuguese
CREATE INDEX IF NOT EXISTS idx_restaurants_name_fts ON public.restaurants USING gin(to_tsvector('portuguese', name));