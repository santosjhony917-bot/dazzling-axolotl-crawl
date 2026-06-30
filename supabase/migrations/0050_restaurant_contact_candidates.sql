alter table public.restaurants
  add column if not exists contact_candidates jsonb not null default '[]'::jsonb,
  add column if not exists primary_contact_source text,
  add column if not exists contacts_last_checked_at timestamptz;

create index if not exists idx_restaurants_contact_candidates
  on public.restaurants using gin (contact_candidates);

comment on column public.restaurants.contact_candidates is
  'Lista de contatos encontrados pelo Validar IA/Extensão em Maps, Instagram, WhatsApp, cardápio, snippets e páginas visitadas.';

comment on column public.restaurants.primary_contact_source is
  'Fonte do contato principal escolhido para CRM/app, priorizando WhatsApp quando disponível.';

comment on column public.restaurants.contacts_last_checked_at is
  'Última data em que o Validar IA revisou e ranqueou contatos do restaurante.';
