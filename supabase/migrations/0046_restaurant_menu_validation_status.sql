-- Status explícito da coleta de cardápio no Validar IA.
-- Nem todo restaurante elegível possui cardápio online; isso deve ser um
-- resultado rastreável, não uma falha infinita do robô.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS menu_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS menu_status_reason text,
  ADD COLUMN IF NOT EXISTS menu_last_checked_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_menu_status_check
    CHECK (menu_status IN (
      'unknown',
      'found',
      'not_found',
      'unavailable',
      'manual_required',
      'blocked',
      'invalid_source',
      'failed'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_restaurants_menu_status
  ON public.restaurants(menu_status, menu_last_checked_at DESC);
