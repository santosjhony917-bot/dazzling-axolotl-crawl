-- Phase 1 now stores only the Google Maps identity/link.
-- Validar IA uses this as the canonical starting point for all enrichment.

alter table public.restaurants
  add column if not exists google_maps_url text,
  add column if not exists google_place_id text;

create index if not exists idx_restaurants_google_maps_url
  on public.restaurants (google_maps_url)
  where google_maps_url is not null;

create index if not exists idx_restaurants_google_place_id
  on public.restaurants (google_place_id)
  where google_place_id is not null;
