-- Suporte nativo para combos/ofertas estruturadas no cardapio.
-- A IA do Validar IA passa a salvar o item vendido pelo restaurante como um
-- combo com componentes internos, em vez de transformar escolhas/adicionais
-- em categorias publicas soltas.

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS combo_components jsonb,
  ADD COLUMN IF NOT EXISTS combo_rules jsonb,
  ADD COLUMN IF NOT EXISTS combo_display_mode text,
  ADD COLUMN IF NOT EXISTS serves_count integer,
  ADD COLUMN IF NOT EXISTS is_public_searchable boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_combo_display_mode_check
    CHECK (
      combo_display_mode IS NULL
      OR combo_display_mode IN ('combo_card', 'compact_combo', 'promotion_card', 'menu_set')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_menu_items_combo_components_gin
  ON public.menu_items USING gin(combo_components);

CREATE INDEX IF NOT EXISTS idx_menu_items_combo_rules_gin
  ON public.menu_items USING gin(combo_rules);

CREATE INDEX IF NOT EXISTS idx_menu_items_combo_display_mode
  ON public.menu_items(combo_display_mode) WHERE combo_display_mode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_menu_items_public_searchable
  ON public.menu_items(is_public_searchable) WHERE is_public_searchable = true;
