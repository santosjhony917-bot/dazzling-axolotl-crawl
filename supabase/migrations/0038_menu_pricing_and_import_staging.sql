-- Cardápios reais nem sempre possuem preço fixo no item: o valor pode estar
-- em uma opção, no menu fechado, em uma faixa ou simplesmente não estar publicado.
ALTER TABLE public.menu_items ALTER COLUMN price DROP NOT NULL;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS price_type text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS price_min numeric,
  ADD COLUMN IF NOT EXISTS price_max numeric,
  ADD COLUMN IF NOT EXISTS original_price numeric,
  ADD COLUMN IF NOT EXISTS promotional_price numeric,
  ADD COLUMN IF NOT EXISTS price_source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_external_id text,
  ADD COLUMN IF NOT EXISTS raw_data jsonb,
  ADD COLUMN IF NOT EXISTS extraction_confidence numeric,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_price_type_check
    CHECK (price_type IN ('fixed', 'starting_at', 'range', 'option_only', 'inherited', 'included', 'free', 'unknown'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_menu_items_source_external_id
  ON public.menu_items(source_external_id) WHERE source_external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_needs_review
  ON public.menu_items(needs_review) WHERE needs_review = true;

CREATE TABLE IF NOT EXISTS public.menu_item_options (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  external_id text,
  group_name text,
  name text NOT NULL,
  description text,
  price numeric,
  price_delta numeric,
  min_quantity integer DEFAULT 0,
  max_quantity integer,
  is_required boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  order_index integer DEFAULT 0,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_item_options_item ON public.menu_item_options(menu_item_id);

CREATE TABLE IF NOT EXISTS public.menu_import_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  source_url text,
  platform text,
  status text NOT NULL DEFAULT 'staging',
  extraction_level integer NOT NULL DEFAULT 0,
  confidence numeric NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  priced_item_count integer NOT NULL DEFAULT 0,
  unresolved_item_count integer NOT NULL DEFAULT 0,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  committed_at timestamptz
);

DO $$ BEGIN
  ALTER TABLE public.menu_import_runs ADD CONSTRAINT menu_import_runs_status_check
    CHECK (status IN ('staging', 'approved', 'committed', 'rejected', 'failed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.menu_import_staging_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.menu_import_runs(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  category_order integer NOT NULL DEFAULT 0,
  item_order integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_import_runs_restaurant ON public.menu_import_runs(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_import_staging_run ON public.menu_import_staging_items(run_id);

-- O coletor local usa a chave pública, como o restante do pipeline de scraping.
ALTER TABLE public.menu_item_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_import_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_import_staging_items DISABLE ROW LEVEL SECURITY;
