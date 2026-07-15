BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_catalog;

SELECT no_plan();

CREATE OR REPLACE FUNCTION pg_temp.sqlstate_of(statement text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE statement;
  RETURN '00000';
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE;
END;
$$;

GRANT EXECUTE ON FUNCTION pg_temp.sqlstate_of(text) TO PUBLIC;

-- Deterministic fixture identities. Everything is rolled back at the end of this file.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'catalog-owner-a@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'catalog-owner-b@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'catalog-customer@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000000-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'catalog-admin@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

INSERT INTO public.restaurants (
  id, user_id, name, category, city, state, neighborhood, latitude, longitude,
  phone, plan, is_published, ai_validated, is_deleted, menu_status,
  location_verified_at, rating, reviews_count
)
VALUES
  (
    'b1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'Contrato Pizza A', 'Pizzaria', 'Joao Pessoa', 'PB', 'Centro',
    -7.1195, -34.8450, '+5583999990001', 'free', true, true, false, 'found',
    now(), 0, 0
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000002',
    'Contrato Pizza B', 'Pizzaria', 'Joao Pessoa', 'PB', 'Centro',
    -7.1200, -34.8460, '+5583999990002', 'free', true, true, false, 'found',
    now(), 0, 0
  );

INSERT INTO public.menu_sections (id, restaurant_id, name, order_index)
VALUES
  ('e1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'Cardapio A', 0),
  ('e1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002', 'Cardapio B', 0);

INSERT INTO public.menu_categories (id, restaurant_id, section_id, name, is_active)
VALUES
  (
    'c1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'e1000000-0000-4000-8000-000000000001', 'Pizzas', true
  ),
  (
    'c1000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000002',
    'e1000000-0000-4000-8000-000000000002', 'Pizzas', true
  );

INSERT INTO public.menu_items (
  id, category_id, name, price, price_type, source_url, price_source,
  is_active, is_public_searchable, is_illustrative, needs_review
)
VALUES
  (
    'd1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    'Pizza Contrato A', 39.90, 'fixed', 'https://example.test/a/menu', 'official_menu',
    true, true, false, false
  ),
  (
    'd1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000002',
    'Pizza Contrato B', 49.90, 'fixed', 'https://example.test/b/menu', 'official_menu',
    true, true, false, false
  );

INSERT INTO public.menu_option_groups (
  id, menu_item_id, name, min_quantity, max_quantity, is_required, order_index
)
VALUES
  (
    'f1000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000001', 'Tamanho', 1, 1, true, 0
  ),
  (
    'f1000000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000002', 'Tamanho', 1, 1, true, 0
  );

INSERT INTO public.menu_item_options (
  id, menu_item_id, group_id, group_name, name, price, is_available,
  is_searchable_variant, order_index
)
VALUES
  (
    'f2000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000001', 'Tamanho', 'Grande', 39.90, true, true, 0
  ),
  (
    'f2000000-0000-4000-8000-000000000002',
    'd1000000-0000-4000-8000-000000000002',
    'f1000000-0000-4000-8000-000000000002', 'Tamanho', 'Grande', 49.90, true, true, 0
  );

INSERT INTO public.restaurant_gallery (id, restaurant_id, image_url, caption, order_index)
VALUES
  (
    'f3000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    'https://example.test/a/photo.webp', 'Salao A', 0
  ),
  (
    'f3000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000002',
    'https://example.test/b/photo.webp', 'Salao B', 0
  );

INSERT INTO public.catalog_publication_audits (
  restaurant_id, status, audit_method, audited_at, audited_by,
  source_checked_at, evidence, notes
)
VALUES
  (
    'b1000000-0000-4000-8000-000000000001', 'approved', 'manual', now(),
    'a1000000-0000-4000-8000-000000000004', now(),
    '{"identity":"checked","menu":"official","price":"checked"}'::jsonb,
    'pgTAP access-contract fixture'
  ),
  (
    'b1000000-0000-4000-8000-000000000002', 'approved', 'manual', now(),
    'a1000000-0000-4000-8000-000000000004', now(),
    '{"identity":"checked","menu":"official","price":"checked"}'::jsonb,
    'pgTAP access-contract fixture'
  );

-- Anonymous client: projections and bounded RPCs work; base inventory stays private.
SELECT set_config(
  'request.jwt.claims',
  '{"role":"anon","app_metadata":{},"user_metadata":{}}',
  true
);
SET SESSION AUTHORIZATION anon;

SELECT is(
  pg_temp.sqlstate_of('SELECT id FROM public.restaurants LIMIT 1'),
  '42501',
  'anon cannot read restaurants directly'
);
SELECT is((SELECT count(*) FROM public.public_catalog_restaurants), 2::bigint,
  'anon sees only the two eligible restaurant projections');
SELECT is((SELECT count(*) FROM public.public_catalog_menu_items), 4::bigint,
  'anon sees two grounded items and their two searchable variants');
SELECT is((SELECT count(*) FROM public.public_catalog_menu_sections), 2::bigint,
  'anon sees sections only for eligible restaurants');
SELECT is((SELECT count(*) FROM public.public_catalog_menu_categories), 2::bigint,
  'anon sees active categories only for eligible restaurants');
SELECT is((SELECT count(*) FROM public.public_catalog_menu_entries), 2::bigint,
  'anon sees safe menu entries only for eligible restaurants');
SELECT is((SELECT count(*) FROM public.public_catalog_menu_option_groups), 2::bigint,
  'anon sees option groups only for eligible menu entries');
SELECT is((SELECT count(*) FROM public.public_catalog_menu_item_options), 2::bigint,
  'anon sees available options only for eligible menu entries');
SELECT is((SELECT count(*) FROM public.public_catalog_gallery), 2::bigint,
  'anon sees gallery media only for eligible restaurants');
SELECT is(
  (SELECT count(*) FROM public.search_public_catalog(ARRAY['pizza'], 20, 0)),
  4::bigint,
  'anon can use grounded public search across items and searchable variants'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.find_public_catalog_restaurants(
      -7.1195, -34.8450, 10, 'pizza', ARRAY['Pizzaria'], 20, 0
    )
  ),
  2::bigint,
  'anon can use bounded nearby search over the eligible projection'
);
SELECT is(
  (
    SELECT restaurant_count
    FROM public.get_public_catalog_coverage('Joao Pessoa', 'PB', 'Centro', 20)
  ),
  2::bigint,
  'coverage RPC executes and reports only eligible restaurants'
);
SELECT is(
  pg_temp.sqlstate_of(
    'SELECT * FROM public.search_public_catalog(ARRAY[''pizza''], 51, 0)'
  ),
  '22023',
  'public search rejects an excessive result limit'
);

RESET SESSION AUTHORIZATION;

-- Authenticated customer: forged user_metadata is never an admin authority.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{},"user_metadata":{"role":"admin"}}',
  true
);
SET SESSION AUTHORIZATION authenticated;

SELECT is(public.is_admin(), false,
  'customer cannot forge admin through user_metadata');
SELECT is((SELECT count(*) FROM public.restaurants), 0::bigint,
  'customer cannot see another owner base row');
SELECT is((SELECT count(*) FROM public.public_catalog_restaurants), 2::bigint,
  'customer can still read the safe public projection');
SELECT is(
  pg_temp.sqlstate_of(
    $$INSERT INTO public.menu_categories (restaurant_id, name)
      VALUES ('b1000000-0000-4000-8000-000000000001', 'Ataque')$$
  ),
  '42501',
  'customer cannot create a category under another restaurant'
);
SELECT is(
  pg_temp.sqlstate_of(
    $$INSERT INTO public.restaurants (
        id, user_id, name, plan, is_published, ai_validated, is_deleted, menu_status
      ) VALUES (
        'b1000000-0000-4000-8000-000000000099',
        'a1000000-0000-4000-8000-000000000003',
        'Tentativa publicada', 'free', true, false, false, 'unknown'
      )$$
  ),
  '42501',
  'customer cannot self-publish while creating a restaurant'
);
SELECT is(
  pg_temp.sqlstate_of(
    $$INSERT INTO public.restaurants (
        id, user_id, name, plan, is_published, ai_validated, is_deleted, menu_status
      ) VALUES (
        'b1000000-0000-4000-8000-000000000003',
        'a1000000-0000-4000-8000-000000000003',
        'Rascunho do cliente', 'free', false, false, false, 'unknown'
      )$$
  ),
  '00000',
  'customer can create an honest unpublished restaurant draft'
);
SELECT is((SELECT count(*) FROM public.restaurants), 1::bigint,
  'customer sees only the draft they now own');

RESET SESSION AUTHORIZATION;

-- Owner: direct access is scoped to owned rows and material changes invalidate approval.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{},"user_metadata":{}}',
  true
);
SET SESSION AUTHORIZATION authenticated;

SELECT is((SELECT count(*) FROM public.restaurants), 1::bigint,
  'owner sees exactly their own restaurant base row');
SELECT is((SELECT count(*) FROM public.menu_categories), 1::bigint,
  'owner sees exactly their own categories');
SELECT is((SELECT count(*) FROM public.menu_items), 1::bigint,
  'owner sees exactly their own items');
SELECT is((SELECT count(*) FROM public.menu_sections), 1::bigint,
  'owner sees exactly their own menu sections');
SELECT is((SELECT count(*) FROM public.menu_option_groups), 1::bigint,
  'owner sees exactly their own option groups');
SELECT is((SELECT count(*) FROM public.menu_item_options), 1::bigint,
  'owner sees exactly their own item options');
SELECT is((SELECT count(*) FROM public.restaurant_gallery), 1::bigint,
  'owner sees exactly their own gallery rows');
SELECT is(
  pg_temp.sqlstate_of(
    $$UPDATE public.restaurants
      SET is_published = false
      WHERE id = 'b1000000-0000-4000-8000-000000000001'$$
  ),
  '42501',
  'owner cannot change a protected publication field'
);
SELECT is(
  pg_temp.sqlstate_of(
    $$UPDATE public.menu_items
      SET name = 'Pizza Contrato A revisada'
      WHERE id = 'd1000000-0000-4000-8000-000000000001'$$
  ),
  '00000',
  'owner can edit their own menu item'
);
SELECT is(
  (SELECT status FROM public.catalog_publication_audits
   WHERE restaurant_id = 'b1000000-0000-4000-8000-000000000001'),
  'pending',
  'material owner edit invalidates the publication audit'
);
SELECT is((SELECT count(*) FROM public.public_catalog_restaurants), 1::bigint,
  'invalidated restaurant disappears immediately from the public projection');
UPDATE public.catalog_publication_audits
SET status = 'approved', audited_at = now(), source_checked_at = now(),
    evidence = '{"forged":true}'::jsonb
WHERE restaurant_id = 'b1000000-0000-4000-8000-000000000001';
SELECT is(
  (SELECT status FROM public.catalog_publication_audits
   WHERE restaurant_id = 'b1000000-0000-4000-8000-000000000001'),
  'pending',
  'owner cannot reapprove their own invalidated audit'
);
DELETE FROM public.restaurants
WHERE id = 'b1000000-0000-4000-8000-000000000001';
SELECT is((SELECT count(*) FROM public.restaurants), 1::bigint,
  'owner cannot delete a restaurant');

RESET SESSION AUTHORIZATION;

-- Admin: authority comes from app_metadata and can operate all protected workflows.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000004","role":"authenticated","app_metadata":{"role":"admin"},"user_metadata":{}}',
  true
);
SET SESSION AUTHORIZATION authenticated;

SELECT is(public.is_admin(), true,
  'server-controlled app_metadata grants admin authority');
SELECT is((SELECT count(*) FROM public.restaurants), 3::bigint,
  'admin sees all fixture restaurants');
SELECT is(
  pg_temp.sqlstate_of(
    $$UPDATE public.restaurants SET rating = 4.7
      WHERE id = 'b1000000-0000-4000-8000-000000000001'$$
  ),
  '00000',
  'admin can update a protected system field'
);
SELECT is(
  pg_temp.sqlstate_of(
    $$UPDATE public.catalog_publication_audits
      SET status = 'approved', audited_at = now(), source_checked_at = now(),
          evidence = '{"identity":"rechecked","menu":"official","price":"rechecked"}'::jsonb
      WHERE restaurant_id = 'b1000000-0000-4000-8000-000000000001'$$
  ),
  '00000',
  'admin can approve a traceable publication audit'
);
SELECT is((SELECT count(*) FROM public.public_catalog_restaurants), 2::bigint,
  'admin reapproval restores the eligible restaurant projection');
UPDATE public.restaurant_gallery
SET restaurant_id = 'b1000000-0000-4000-8000-000000000002'
WHERE id = 'f3000000-0000-4000-8000-000000000001';
SELECT is(
  (
    SELECT count(*)
    FROM public.catalog_publication_audits
    WHERE restaurant_id IN (
      'b1000000-0000-4000-8000-000000000001',
      'b1000000-0000-4000-8000-000000000002'
    )
      AND status = 'pending'
  ),
  2::bigint,
  'reparenting catalog data invalidates both source and destination audits'
);
SELECT is((SELECT count(*) FROM public.public_catalog_restaurants), 0::bigint,
  'both reparented catalogs leave the public projection until reaudited');
UPDATE public.catalog_publication_audits
SET status = 'approved', audited_at = now(), source_checked_at = now(),
    evidence = '{"identity":"rechecked","menu":"official","price":"rechecked","reparenting":"checked"}'::jsonb
WHERE restaurant_id IN (
  'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000002'
);
SELECT is((SELECT count(*) FROM public.public_catalog_restaurants), 2::bigint,
  'admin can reapprove both catalogs after reviewing the move');
DELETE FROM public.restaurants
WHERE id = 'b1000000-0000-4000-8000-000000000003';
SELECT is((SELECT count(*) FROM public.restaurants), 2::bigint,
  'admin can delete the customer draft');

RESET SESSION AUTHORIZATION;

-- Service worker: trusted server role bypasses RLS and can read private readiness.
SELECT set_config(
  'request.jwt.claims',
  '{"role":"service_role","app_metadata":{},"user_metadata":{}}',
  true
);
SET SESSION AUTHORIZATION service_role;

SELECT is((SELECT count(*) FROM public.restaurants), 2::bigint,
  'service role reads all protected restaurant rows');
SELECT is((SELECT count(*) FROM public.catalog_restaurant_readiness), 2::bigint,
  'service role reads private readiness diagnostics');
SELECT is(
  pg_temp.sqlstate_of(
    $$UPDATE public.restaurants SET reviews_count = 17
      WHERE id = 'b1000000-0000-4000-8000-000000000002'$$
  ),
  '00000',
  'service role can update protected system fields'
);

RESET SESSION AUTHORIZATION;

SELECT * FROM finish();
ROLLBACK;
