-- 23. Adiciona a coluna is_illustrative para menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_illustrative boolean DEFAULT false;
