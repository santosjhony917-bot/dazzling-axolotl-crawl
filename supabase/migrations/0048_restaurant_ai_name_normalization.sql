-- Stores raw Google Maps names and the AI decision for the public/commercial name.
-- This lets Phase 1 keep evidence while Validar IA decides the display name.

alter table public.restaurants
  add column if not exists google_maps_name text,
  add column if not exists ai_normalized_name text,
  add column if not exists name_cleanup_notes text;

create index if not exists idx_restaurants_google_maps_name
  on public.restaurants (google_maps_name)
  where google_maps_name is not null;
