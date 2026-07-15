BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_catalog;

SELECT no_plan();

-- These tests are intentionally strict. An unexpected policy or grant is a release
-- blocker because a permissive legacy policy can silently widen the new contract.
SELECT has_table('public', 'catalog_publication_audits',
  'publication audits table exists');
SELECT has_view('public', 'catalog_restaurant_readiness',
  'private readiness view exists');
SELECT has_view('public', 'public_catalog_restaurants',
  'safe public restaurant view exists');
SELECT has_view('public', 'public_catalog_menu_items',
  'safe public menu view exists');
SELECT has_view('public', 'public_catalog_menu_sections',
  'safe public menu-section view exists');
SELECT has_view('public', 'public_catalog_menu_categories',
  'safe public menu-category view exists');
SELECT has_view('public', 'public_catalog_menu_entries',
  'safe public menu-entry view exists');
SELECT has_view('public', 'public_catalog_menu_option_groups',
  'safe public option-group view exists');
SELECT has_view('public', 'public_catalog_menu_item_options',
  'safe public item-option view exists');
SELECT has_view('public', 'public_catalog_gallery',
  'safe public gallery view exists');
SELECT has_function('public', 'search_public_catalog',
  ARRAY['text[]', 'integer', 'integer', 'text', 'text', 'text', 'text',
        'numeric', 'numeric', 'numeric', 'numeric', 'numeric'],
  'bounded public search RPC exists');
SELECT has_function('public', 'get_public_catalog_coverage',
  ARRAY['text', 'text', 'text', 'integer'],
  'public coverage RPC exists');
SELECT has_function('public', 'find_public_catalog_restaurants',
  ARRAY['numeric', 'numeric', 'numeric', 'text', 'text[]', 'integer', 'integer'],
  'bounded nearby public-catalog RPC exists');

SELECT ok(
  (
    SELECT bool_and(c.relrowsecurity)
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = ANY (ARRAY[
        'restaurants', 'menu_sections', 'menu_categories', 'menu_items',
        'menu_option_groups', 'menu_item_options', 'restaurant_gallery',
        'catalog_publication_audits'
      ])
  ),
  'RLS is enabled on every protected catalog table'
);

SELECT is(
  (
    SELECT array_agg(p.polname::text ORDER BY p.polname::text)
    FROM pg_policy AS p
    JOIN pg_class AS c ON c.oid = p.polrelid
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = ANY (ARRAY[
        'restaurants', 'menu_sections', 'menu_categories', 'menu_items',
        'menu_option_groups', 'menu_item_options', 'restaurant_gallery',
        'catalog_publication_audits'
      ])
  ),
  ARRAY[
    'catalog_audits_admin_delete',
    'catalog_audits_admin_insert',
    'catalog_audits_admin_update',
    'catalog_audits_owner_admin_select',
    'catalog_categories_owner_admin_delete',
    'catalog_categories_owner_admin_insert',
    'catalog_categories_owner_admin_select',
    'catalog_categories_owner_admin_update',
    'catalog_gallery_owner_admin_all',
    'catalog_items_owner_admin_delete',
    'catalog_items_owner_admin_insert',
    'catalog_items_owner_admin_select',
    'catalog_items_owner_admin_update',
    'catalog_option_groups_owner_admin_all',
    'catalog_options_owner_admin_all',
    'catalog_restaurants_admin_delete',
    'catalog_restaurants_owner_admin_insert',
    'catalog_restaurants_owner_admin_select',
    'catalog_restaurants_owner_admin_update',
    'catalog_sections_owner_admin_delete',
    'catalog_sections_owner_admin_insert',
    'catalog_sections_owner_admin_select',
    'catalog_sections_owner_admin_update'
  ]::text[],
  'protected tables have exactly the reviewed policies and no permissive legacy drift'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.restaurants', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.menu_categories', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.menu_items', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.catalog_publication_audits', 'SELECT'),
  'anon cannot read protected base tables or publication audits'
);

SELECT ok(
  (
    SELECT bool_and(
      NOT has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
      AND NOT has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
      AND NOT has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
      AND NOT has_table_privilege('anon', format('public.%I', table_name), 'DELETE')
    )
    FROM unnest(ARRAY[
      'restaurants', 'menu_sections', 'menu_categories', 'menu_items',
      'menu_option_groups', 'menu_item_options', 'restaurant_gallery',
      'catalog_publication_audits'
    ]) AS protected(table_name)
  ),
  'anon has no direct privilege on any protected catalog table'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.restaurants', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.restaurants', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.restaurants', 'DELETE')
  AND NOT has_table_privilege('anon', 'public.restaurants', 'TRUNCATE')
  AND NOT has_table_privilege('anon', 'public.restaurants', 'TRIGGER')
  AND NOT has_table_privilege('anon', 'public.restaurants', 'REFERENCES'),
  'anon has no write or table-bypass capability'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.restaurants', 'SELECT')
  AND has_table_privilege('authenticated', 'public.restaurants', 'INSERT')
  AND has_table_privilege('authenticated', 'public.restaurants', 'UPDATE')
  AND has_table_privilege('authenticated', 'public.restaurants', 'DELETE')
  AND NOT has_table_privilege('authenticated', 'public.restaurants', 'TRUNCATE')
  AND NOT has_table_privilege('authenticated', 'public.restaurants', 'TRIGGER')
  AND NOT has_table_privilege('authenticated', 'public.restaurants', 'REFERENCES'),
  'authenticated has only RLS-mediated DML on protected tables'
);

SELECT ok(
  (
    SELECT bool_and(
      has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
      AND has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
      AND has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
      AND has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
      AND NOT has_table_privilege('authenticated', format('public.%I', table_name), 'TRUNCATE')
      AND NOT has_table_privilege('authenticated', format('public.%I', table_name), 'TRIGGER')
      AND NOT has_table_privilege('authenticated', format('public.%I', table_name), 'REFERENCES')
    )
    FROM unnest(ARRAY[
      'restaurants', 'menu_sections', 'menu_categories', 'menu_items',
      'menu_option_groups', 'menu_item_options', 'restaurant_gallery',
      'catalog_publication_audits'
    ]) AS protected(table_name)
  ),
  'authenticated DML is RLS-mediated on every protected table without bypass grants'
);

SELECT ok(
  has_table_privilege('anon', 'public.public_catalog_restaurants', 'SELECT')
  AND has_table_privilege('authenticated', 'public.public_catalog_restaurants', 'SELECT')
  AND has_table_privilege('anon', 'public.public_catalog_menu_items', 'SELECT')
  AND has_table_privilege('authenticated', 'public.public_catalog_menu_items', 'SELECT'),
  'browser roles can read only the reviewed public projections'
);

SELECT ok(
  (
    SELECT bool_and(
      has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'SELECT')
      AND has_table_privilege('authenticated', format('%I.%I', table_schema, table_name), 'SELECT')
    )
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = ANY (ARRAY[
        'public_catalog_menu_sections',
        'public_catalog_menu_categories',
        'public_catalog_menu_entries',
        'public_catalog_menu_option_groups',
        'public_catalog_menu_item_options',
        'public_catalog_gallery'
      ])
  ),
  'browser roles can read every safe public profile/menu projection'
);

SELECT ok(
  (
    SELECT bool_and(
      NOT has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'INSERT')
      AND NOT has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'UPDATE')
      AND NOT has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'DELETE')
      AND NOT has_table_privilege('authenticated', format('%I.%I', table_schema, table_name), 'INSERT')
      AND NOT has_table_privilege('authenticated', format('%I.%I', table_schema, table_name), 'UPDATE')
      AND NOT has_table_privilege('authenticated', format('%I.%I', table_schema, table_name), 'DELETE')
    )
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name LIKE 'public_catalog_%'
  ),
  'all public catalog projections are read-only to browser roles'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.catalog_restaurant_readiness', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.catalog_restaurant_readiness', 'SELECT')
  AND has_table_privilege('service_role', 'public.catalog_restaurant_readiness', 'SELECT'),
  'readiness diagnostics remain service-role only'
);

SELECT ok(
  has_function_privilege(
    'anon',
    'public.search_public_catalog(text[],integer,integer,text,text,text,text,numeric,numeric,numeric,numeric,numeric)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'authenticated',
    'public.search_public_catalog(text[],integer,integer,text,text,text,text,numeric,numeric,numeric,numeric,numeric)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'anon',
    'public.get_public_catalog_coverage(text,text,text,integer)',
    'EXECUTE'
  ),
  'browser roles can execute only the bounded public catalog RPCs'
);

SELECT ok(
  has_function_privilege(
    'anon',
    'public.find_public_catalog_restaurants(numeric,numeric,numeric,text,text[],integer,integer)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'authenticated',
    'public.find_public_catalog_restaurants(numeric,numeric,numeric,text,text[],integer,integer)',
    'EXECUTE'
  ),
  'browser roles can execute bounded nearby public-catalog search'
);

SELECT ok(
  NOT has_function_privilege(
    'anon', 'public.search_menu_items(text,integer,integer,uuid[])', 'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated', 'public.search_menu_items(text,integer,integer,uuid[])', 'EXECUTE'
  )
  AND has_function_privilege(
    'service_role', 'public.search_menu_items(text,integer,integer,uuid[])', 'EXECUTE'
  ),
  'legacy menu search is service-role only'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.find_nearby_restaurants(numeric,numeric,numeric,text,text[],integer,integer)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.find_nearby_restaurants(numeric,numeric,numeric,text,text[],integer,integer)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'service_role',
    'public.find_nearby_restaurants(numeric,numeric,numeric,text,text[],integer,integer)',
    'EXECUTE'
  ),
  'legacy nearby search is service-role only'
);

SELECT ok(
  (
    SELECT bool_and(p.prosecdef)
      AND bool_and(p.proconfig @> ARRAY['search_path=pg_catalog']::text[])
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'is_admin',
        'can_manage_restaurant',
        'can_manage_menu_category',
        'can_manage_menu_item',
        'protect_restaurant_system_fields',
        'invalidate_catalog_publication_audit',
        'find_public_catalog_restaurants',
        'search_public_catalog',
        'get_public_catalog_coverage'
      ])
  ),
  'every reviewed SECURITY DEFINER function pins search_path to pg_catalog'
);

SELECT is(
  (
    SELECT count(*)::bigint
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'is_admin',
        'can_manage_restaurant',
        'can_manage_menu_category',
        'can_manage_menu_item',
        'protect_restaurant_system_fields',
        'invalidate_catalog_publication_audit',
        'find_public_catalog_restaurants',
        'search_public_catalog',
        'get_public_catalog_coverage'
      ])
  ),
  9::bigint,
  'the complete reviewed SECURITY DEFINER function set exists'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated', 'public.protect_restaurant_system_fields()', 'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated', 'public.invalidate_catalog_publication_audit()', 'EXECUTE'
  ),
  'trigger functions cannot be invoked directly by browser roles'
);

SELECT ok(
  (
    SELECT bool_and(c.reloptions @> ARRAY['security_barrier=true']::text[])
      AND bool_and(c.reloptions @> ARRAY['security_invoker=false']::text[])
      AND bool_and(pg_get_userbyid(c.relowner) NOT IN ('anon', 'authenticated', 'service_role'))
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = ANY (ARRAY[
        'catalog_restaurant_readiness',
        'public_catalog_restaurants',
        'public_catalog_menu_items',
        'public_catalog_menu_sections',
        'public_catalog_menu_categories',
        'public_catalog_menu_entries',
        'public_catalog_menu_option_groups',
        'public_catalog_menu_item_options',
        'public_catalog_gallery'
      ])
  ),
  'catalog views are security-barrier definer views owned outside API roles'
);

SELECT is(
  (
    SELECT count(*)::bigint
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_catalog_restaurants'
      AND column_name = ANY (ARRAY[
        'user_id', 'email', 'cnpj', 'claim_code', 'ai_log', 'contact_candidates',
        'contacts_last_checked_at', 'primary_contact_source', 'menu_status_reason',
        'location_issue_reason'
      ])
  ),
  0::bigint,
  'public restaurant projection excludes owner and operational fields'
);

SELECT is(
  (
    SELECT count(*)::bigint
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_catalog_menu_items'
      AND column_name = ANY (ARRAY[
        'raw_data', 'import_notes', 'extraction_confidence', 'needs_review',
        'source_external_id', 'search_keywords'
      ])
  ),
  0::bigint,
  'public menu projection excludes extraction and operational fields'
);

SELECT is(
  (
    SELECT count(*)::bigint
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY (ARRAY[
        'public_catalog_menu_entries',
        'public_catalog_menu_option_groups',
        'public_catalog_menu_item_options',
        'public_catalog_gallery'
      ])
      AND column_name = ANY (ARRAY[
        'raw_data', 'import_notes', 'extraction_confidence', 'needs_review',
        'source_external_id', 'external_id', 'ai_confidence', 'ai_reason'
      ])
  ),
  0::bigint,
  'profile/menu projections exclude extraction and AI operational metadata'
);

SELECT is(
  (
    SELECT count(*)::bigint
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = ANY (ARRAY[
        'restaurants', 'menu_sections', 'menu_categories', 'menu_items',
        'menu_option_groups', 'menu_item_options', 'restaurant_gallery',
        'catalog_publication_audits'
      ])
      AND grantee IN ('anon', 'authenticated')
      AND privilege_type IN ('TRUNCATE', 'TRIGGER', 'REFERENCES')
  ),
  0::bigint,
  'browser roles have no TRUNCATE, TRIGGER or REFERENCES grants anywhere in the catalog'
);

SELECT ok(
  (
    SELECT rolbypassrls
    FROM pg_roles
    WHERE rolname = 'service_role'
  ),
  'service_role retains explicit BYPASSRLS for trusted server workers'
);

SELECT is(
  (
    SELECT count(*)::bigint
    FROM pg_trigger AS t
    JOIN pg_class AS c ON c.oid = t.tgrelid
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
      AND t.tgenabled <> 'D'
      AND t.tgname = ANY (ARRAY[
        'protect_restaurant_system_fields_trigger',
        'invalidate_catalog_audit_restaurant',
        'invalidate_catalog_audit_sections',
        'invalidate_catalog_audit_categories',
        'invalidate_catalog_audit_items',
        'invalidate_catalog_audit_option_groups',
        'invalidate_catalog_audit_options',
        'invalidate_catalog_audit_gallery'
      ])
  ),
  8::bigint,
  'system-field protection and every audit invalidation trigger are enabled'
);

SELECT * FROM finish();
ROLLBACK;
