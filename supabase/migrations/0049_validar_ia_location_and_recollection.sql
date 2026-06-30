-- Validar IA needs explicit, queryable status for the autonomous QA loop.
-- This migration is safe to run even when older migrations were not applied yet.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS menu_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS menu_status_reason text,
  ADD COLUMN IF NOT EXISTS menu_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_source text,
  ADD COLUMN IF NOT EXISTS location_confidence numeric(4, 3),
  ADD COLUMN IF NOT EXISTS location_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_issue_reason text;

DO $$
BEGIN
  ALTER TABLE public.restaurants
    DROP CONSTRAINT IF EXISTS restaurants_menu_status_check;

  ALTER TABLE public.restaurants
    ADD CONSTRAINT restaurants_menu_status_check
    CHECK (menu_status IN (
      'unknown',
      'found',
      'not_found',
      'unavailable',
      'manual_required',
      'blocked',
      'invalid_source',
      'failed',
      'needs_recollection'
    ));
END $$;

DO $$
BEGIN
  ALTER TABLE public.restaurants
    DROP CONSTRAINT IF EXISTS restaurants_location_confidence_check;

  ALTER TABLE public.restaurants
    ADD CONSTRAINT restaurants_location_confidence_check
    CHECK (location_confidence IS NULL OR (location_confidence >= 0 AND location_confidence <= 1));
END $$;

CREATE INDEX IF NOT EXISTS idx_restaurants_menu_status
  ON public.restaurants(menu_status, menu_last_checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_restaurants_location_validation
  ON public.restaurants(city, state, location_verified_at DESC)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON COLUMN public.restaurants.menu_status IS
  'Validar IA menu pipeline status. found means menu was structured and accepted; needs_recollection means AI found an accessible source but current extraction must be redone.';

COMMENT ON COLUMN public.restaurants.location_source IS
  'How latitude/longitude were validated by Validar IA: google_maps_place_url, address_geocode, ai_geocode_query, google_maps_url_fallback, manual.';

COMMENT ON COLUMN public.restaurants.location_confidence IS
  'Confidence score, 0..1, for address/coordinate validation before publishing to app.';

COMMENT ON COLUMN public.restaurants.location_verified_at IS
  'Timestamp when Validar IA last validated that address and coordinates are publishable.';

COMMENT ON COLUMN public.restaurants.location_issue_reason IS
  'Reason when Validar IA could not validate address/coordinates.';
