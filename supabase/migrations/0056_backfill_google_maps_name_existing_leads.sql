-- Existing Phase 1 leads were collected before google_maps_name existed.
-- Preserve the current collected name as the raw Google Maps name fallback so
-- Validar IA can later decide the public/commercial display name without losing evidence.

UPDATE public.restaurants
SET
  google_maps_name = name,
  name_cleanup_notes = COALESCE(
    name_cleanup_notes,
    'Backfill: nome atual preservado como google_maps_name porque o lead foi coletado antes da coluna existir.'
  )
WHERE google_maps_name IS NULL
  AND name IS NOT NULL
  AND trim(name) <> ''
  AND google_maps_url IS NOT NULL;
