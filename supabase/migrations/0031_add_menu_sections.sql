-- 1. Create menu_sections table
CREATE TABLE IF NOT EXISTS public.menu_sections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Add section_id to menu_categories
ALTER TABLE public.menu_categories 
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.menu_sections(id) ON DELETE SET NULL;

-- 3. Enable RLS on menu_sections
ALTER TABLE public.menu_sections ENABLE ROW LEVEL SECURITY;

-- 4. Add RLS Policies for menu_sections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'menu_sections' AND policyname = 'Menu sections are viewable by everyone'
  ) THEN
    CREATE POLICY "Menu sections are viewable by everyone"
      ON public.menu_sections FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'menu_sections' AND policyname = 'Owners and Admins can insert menu sections'
  ) THEN
    CREATE POLICY "Owners and Admins can insert menu sections"
      ON public.menu_sections FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = (SELECT user_id FROM public.restaurants WHERE id = restaurant_id)
        OR public.is_admin()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'menu_sections' AND policyname = 'Owners and Admins can update menu sections'
  ) THEN
    CREATE POLICY "Owners and Admins can update menu sections"
      ON public.menu_sections FOR UPDATE TO authenticated
      USING (
        auth.uid() = (SELECT user_id FROM public.restaurants WHERE id = restaurant_id)
        OR public.is_admin()
      )
      WITH CHECK (
        auth.uid() = (SELECT user_id FROM public.restaurants WHERE id = restaurant_id)
        OR public.is_admin()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'menu_sections' AND policyname = 'Owners and Admins can delete menu sections'
  ) THEN
    CREATE POLICY "Owners and Admins can delete menu sections"
      ON public.menu_sections FOR DELETE TO authenticated
      USING (
        auth.uid() = (SELECT user_id FROM public.restaurants WHERE id = restaurant_id)
        OR public.is_admin()
      );
  END IF;
END
$$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_menu_sections_restaurant_id ON public.menu_sections(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_section_id ON public.menu_categories(section_id);
