-- Disable Row Level Security (RLS) on tables modified by scraping tools and local admin access
ALTER TABLE public.restaurants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_gallery DISABLE ROW LEVEL SECURITY;
