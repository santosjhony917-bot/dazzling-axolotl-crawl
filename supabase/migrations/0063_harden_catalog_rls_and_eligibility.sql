-- Gate 0: secure the catalog write surface and make publication eligibility explicit.
--
-- This migration is intentionally transactional. It does not publish data and it does
-- not backfill audit approvals. Existing rows remain private until every public gate is
-- satisfied. Apply 0064 in the same release before switching clients to the new RPCs.
-- Rollback is by client feature flag/forward fix; never disable RLS or reopen the legacy
-- browser RPCs as a database rollback.

BEGIN;

-- `ai_validated` currently means that the automation processed the restaurant; it is
-- also written for failed and blocked outcomes. Keep publication audit as a distinct
-- phase so validation can never be mistaken for approval.
CREATE TABLE IF NOT EXISTS public.catalog_publication_audits (
  restaurant_id uuid PRIMARY KEY
    REFERENCES public.restaurants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  audit_method text NOT NULL DEFAULT 'manual'
    CHECK (audit_method IN ('manual', 'automated', 'hybrid')),
  audited_at timestamptz,
  audited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_checked_at timestamptz,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_publication_audits_approval_evidence_check CHECK (
    status <> 'approved'
    OR (
      audited_at IS NOT NULL
      AND source_checked_at IS NOT NULL
      AND jsonb_typeof(evidence) = 'object'
      AND evidence <> '{}'::jsonb
    )
  )
);

COMMENT ON TABLE public.catalog_publication_audits IS
  'Explicit publication audit. Validation, collection and structuring do not approve publication.';
COMMENT ON COLUMN public.catalog_publication_audits.source_checked_at IS
  'When the authoritative menu source was last checked during the approving audit.';
COMMENT ON COLUMN public.catalog_publication_audits.evidence IS
  'Traceable evidence for price, source, identity and menu-structure checks. Required for approval.';

-- Admin authorization must use server-controlled app_metadata. user_metadata can be
-- changed by the account owner and therefore is not an authorization source.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Checks the server-controlled JWT app_metadata role. Never trusts user_metadata or an email allowlist.';

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- Small SECURITY DEFINER predicates prevent policy recursion while returning only a
-- boolean authorization decision. Every referenced object is schema-qualified.
CREATE OR REPLACE FUNCTION public.can_manage_restaurant(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT COALESCE(
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.restaurants AS r
      WHERE r.id = p_restaurant_id
        AND r.user_id = auth.uid()
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_menu_category(p_category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT COALESCE(
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.menu_categories AS mc
      JOIN public.restaurants AS r ON r.id = mc.restaurant_id
      WHERE mc.id = p_category_id
        AND r.user_id = auth.uid()
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_menu_item(p_menu_item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT COALESCE(
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.menu_items AS mi
      JOIN public.menu_categories AS mc ON mc.id = mi.category_id
      JOIN public.restaurants AS r ON r.id = mc.restaurant_id
      WHERE mi.id = p_menu_item_id
        AND r.user_id = auth.uid()
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_restaurant(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_menu_category(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_menu_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_restaurant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_menu_category(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_menu_item(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.can_manage_restaurant(uuid) IS
  'True only for the restaurant owner or a server-controlled admin.';
COMMENT ON FUNCTION public.can_manage_menu_category(uuid) IS
  'True only for an owner/admin of the restaurant that owns the category.';
COMMENT ON FUNCTION public.can_manage_menu_item(uuid) IS
  'True only for an owner/admin of the restaurant that owns the menu item.';

-- RLS alone controls rows, not sensitive columns. This trigger prevents an owner from
-- self-publishing, forging validation/rating fields, changing ownership or upgrading a
-- plan. Service-role workers and admins retain those operations.
CREATE OR REPLACE FUNCTION public.protect_restaurant_system_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  request_role text := COALESCE(auth.role(), '');
BEGIN
  IF request_role = 'service_role'
     OR session_user IN ('postgres', 'supabase_admin')
     OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_published, false)
       OR COALESCE(NEW.ai_validated, false)
       OR COALESCE(NEW.is_deleted, false)
       OR COALESCE(NEW.menu_status, 'unknown') <> 'unknown'
       OR NEW.menu_last_checked_at IS NOT NULL
       OR NEW.location_verified_at IS NOT NULL
       OR NEW.plan IS DISTINCT FROM 'free'::public.restaurant_plan
       OR COALESCE(NEW.rating, 0) <> 0
       OR COALESCE(NEW.reviews_count, 0) <> 0 THEN
      RAISE EXCEPTION 'protected restaurant publication fields require an admin or service role'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.is_published IS DISTINCT FROM OLD.is_published
       OR NEW.ai_validated IS DISTINCT FROM OLD.ai_validated
       OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
       OR NEW.menu_status IS DISTINCT FROM OLD.menu_status
       OR NEW.menu_status_reason IS DISTINCT FROM OLD.menu_status_reason
       OR NEW.menu_last_checked_at IS DISTINCT FROM OLD.menu_last_checked_at
       OR NEW.location_source IS DISTINCT FROM OLD.location_source
       OR NEW.location_confidence IS DISTINCT FROM OLD.location_confidence
       OR NEW.location_verified_at IS DISTINCT FROM OLD.location_verified_at
       OR NEW.location_issue_reason IS DISTINCT FROM OLD.location_issue_reason
       OR NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.reviews_count IS DISTINCT FROM OLD.reviews_count THEN
      RAISE EXCEPTION 'protected restaurant publication fields require an admin or service role'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_restaurant_system_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_restaurant_system_fields_trigger ON public.restaurants;
CREATE TRIGGER protect_restaurant_system_fields_trigger
BEFORE INSERT OR UPDATE ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.protect_restaurant_system_fields();

-- Any material mutation after approval returns the restaurant to `pending`. The audit
-- pipeline must explicitly approve the new version after all writes are complete.
CREATE OR REPLACE FUNCTION public.invalidate_catalog_publication_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  old_restaurant_id uuid;
  new_restaurant_id uuid;
  target_restaurant_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'restaurants' THEN
      -- This trigger is UPDATE-only for restaurants, so both records exist. Keep both
      -- IDs in case an administrative repair ever changes the primary key.
      old_restaurant_id := OLD.id;
      new_restaurant_id := NEW.id;
    WHEN 'menu_sections', 'menu_categories', 'restaurant_gallery' THEN
      IF TG_OP <> 'INSERT' THEN
        old_restaurant_id := OLD.restaurant_id;
      END IF;
      IF TG_OP <> 'DELETE' THEN
        new_restaurant_id := NEW.restaurant_id;
      END IF;
    WHEN 'menu_items' THEN
      IF TG_OP <> 'INSERT' THEN
        SELECT mc.restaurant_id
        INTO old_restaurant_id
        FROM public.menu_categories AS mc
        WHERE mc.id = OLD.category_id;
      END IF;
      IF TG_OP <> 'DELETE' THEN
        SELECT mc.restaurant_id
        INTO new_restaurant_id
        FROM public.menu_categories AS mc
        WHERE mc.id = NEW.category_id;
      END IF;
    WHEN 'menu_option_groups', 'menu_item_options' THEN
      IF TG_OP <> 'INSERT' THEN
        SELECT mc.restaurant_id
        INTO old_restaurant_id
        FROM public.menu_items AS mi
        JOIN public.menu_categories AS mc ON mc.id = mi.category_id
        WHERE mi.id = OLD.menu_item_id;
      END IF;
      IF TG_OP <> 'DELETE' THEN
        SELECT mc.restaurant_id
        INTO new_restaurant_id
        FROM public.menu_items AS mi
        JOIN public.menu_categories AS mc ON mc.id = mi.category_id
        WHERE mi.id = NEW.menu_item_id;
      END IF;
  END CASE;

  target_restaurant_ids := array_remove(
    ARRAY[old_restaurant_id, new_restaurant_id]::uuid[],
    NULL::uuid
  );

  IF cardinality(target_restaurant_ids) > 0 THEN
    UPDATE public.catalog_publication_audits
    SET status = 'pending',
        audited_at = NULL,
        audited_by = NULL,
        source_checked_at = NULL,
        evidence = '{}'::jsonb,
        notes = 'Invalidated automatically after catalog data changed.',
        updated_at = now()
    WHERE restaurant_id = ANY(target_restaurant_ids)
      AND status = 'approved';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.invalidate_catalog_publication_audit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS invalidate_catalog_audit_restaurant ON public.restaurants;
CREATE TRIGGER invalidate_catalog_audit_restaurant
AFTER UPDATE OF
  name, description, image_url, cover_image_url, phone, email, category,
  whatsapp_url, ifood_url, other_url, address, number, neighborhood, city,
  state, cep, latitude, longitude, opening_hours, external_url,
  payment_methods, social_networks, instagram, google_maps_url,
  location_source, location_confidence, location_verified_at
ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.invalidate_catalog_publication_audit();

DROP TRIGGER IF EXISTS invalidate_catalog_audit_sections ON public.menu_sections;
CREATE TRIGGER invalidate_catalog_audit_sections
AFTER INSERT OR UPDATE OR DELETE ON public.menu_sections
FOR EACH ROW EXECUTE FUNCTION public.invalidate_catalog_publication_audit();

DROP TRIGGER IF EXISTS invalidate_catalog_audit_categories ON public.menu_categories;
CREATE TRIGGER invalidate_catalog_audit_categories
AFTER INSERT OR UPDATE OR DELETE ON public.menu_categories
FOR EACH ROW EXECUTE FUNCTION public.invalidate_catalog_publication_audit();

DROP TRIGGER IF EXISTS invalidate_catalog_audit_items ON public.menu_items;
CREATE TRIGGER invalidate_catalog_audit_items
AFTER INSERT OR UPDATE OR DELETE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.invalidate_catalog_publication_audit();

DROP TRIGGER IF EXISTS invalidate_catalog_audit_option_groups ON public.menu_option_groups;
CREATE TRIGGER invalidate_catalog_audit_option_groups
AFTER INSERT OR UPDATE OR DELETE ON public.menu_option_groups
FOR EACH ROW EXECUTE FUNCTION public.invalidate_catalog_publication_audit();

DROP TRIGGER IF EXISTS invalidate_catalog_audit_options ON public.menu_item_options;
CREATE TRIGGER invalidate_catalog_audit_options
AFTER INSERT OR UPDATE OR DELETE ON public.menu_item_options
FOR EACH ROW EXECUTE FUNCTION public.invalidate_catalog_publication_audit();

DROP TRIGGER IF EXISTS invalidate_catalog_audit_gallery ON public.restaurant_gallery;
CREATE TRIGGER invalidate_catalog_audit_gallery
AFTER INSERT OR UPDATE OR DELETE ON public.restaurant_gallery
FOR EACH ROW EXECUTE FUNCTION public.invalidate_catalog_publication_audit();

-- Enable RLS only after all replacement policies are defined in this transaction. If a
-- statement fails, PostgreSQL rolls the entire migration back instead of leaving a
-- partially locked catalog.
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_publication_audits ENABLE ROW LEVEL SECURITY;

-- Remove permissive legacy policies. Public users will read only the projections created
-- below; authenticated owners retain direct access to their own records.
DROP POLICY IF EXISTS "Restaurants are viewable by everyone" ON public.restaurants;
DROP POLICY IF EXISTS "Users can insert their own restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Owners and Admins can update restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can delete any restaurant" ON public.restaurants;

DROP POLICY IF EXISTS "Menu sections are viewable by everyone" ON public.menu_sections;
DROP POLICY IF EXISTS "Owners and Admins can insert menu sections" ON public.menu_sections;
DROP POLICY IF EXISTS "Owners and Admins can update menu sections" ON public.menu_sections;
DROP POLICY IF EXISTS "Owners and Admins can delete menu sections" ON public.menu_sections;

DROP POLICY IF EXISTS "Menu categories are viewable by everyone" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners and Admins can insert menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners and Admins can update menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners and Admins can delete menu categories" ON public.menu_categories;

DROP POLICY IF EXISTS "Menu items are viewable by everyone" ON public.menu_items;
DROP POLICY IF EXISTS "Owners and Admins can insert menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners and Admins can update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners and Admins can delete menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can insert menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can delete menu items" ON public.menu_items;

DROP POLICY IF EXISTS "Gallery images are viewable by everyone" ON public.restaurant_gallery;
DROP POLICY IF EXISTS "Owners and Admins can manage gallery" ON public.restaurant_gallery;

DROP POLICY IF EXISTS catalog_restaurants_owner_admin_select ON public.restaurants;
DROP POLICY IF EXISTS catalog_restaurants_owner_admin_insert ON public.restaurants;
DROP POLICY IF EXISTS catalog_restaurants_owner_admin_update ON public.restaurants;
DROP POLICY IF EXISTS catalog_restaurants_admin_delete ON public.restaurants;
CREATE POLICY catalog_restaurants_owner_admin_select
  ON public.restaurants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY catalog_restaurants_owner_admin_insert
  ON public.restaurants FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      user_id = auth.uid()
      AND COALESCE(is_published, false) = false
      AND COALESCE(ai_validated, false) = false
      AND COALESCE(is_deleted, false) = false
      AND COALESCE(menu_status, 'unknown') = 'unknown'
    )
  );
CREATE POLICY catalog_restaurants_owner_admin_update
  ON public.restaurants FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY catalog_restaurants_admin_delete
  ON public.restaurants FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS catalog_sections_owner_admin_select ON public.menu_sections;
DROP POLICY IF EXISTS catalog_sections_owner_admin_insert ON public.menu_sections;
DROP POLICY IF EXISTS catalog_sections_owner_admin_update ON public.menu_sections;
DROP POLICY IF EXISTS catalog_sections_owner_admin_delete ON public.menu_sections;
CREATE POLICY catalog_sections_owner_admin_select
  ON public.menu_sections FOR SELECT TO authenticated
  USING (public.can_manage_restaurant(restaurant_id));
CREATE POLICY catalog_sections_owner_admin_insert
  ON public.menu_sections FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_restaurant(restaurant_id));
CREATE POLICY catalog_sections_owner_admin_update
  ON public.menu_sections FOR UPDATE TO authenticated
  USING (public.can_manage_restaurant(restaurant_id))
  WITH CHECK (public.can_manage_restaurant(restaurant_id));
CREATE POLICY catalog_sections_owner_admin_delete
  ON public.menu_sections FOR DELETE TO authenticated
  USING (public.can_manage_restaurant(restaurant_id));

DROP POLICY IF EXISTS catalog_categories_owner_admin_select ON public.menu_categories;
DROP POLICY IF EXISTS catalog_categories_owner_admin_insert ON public.menu_categories;
DROP POLICY IF EXISTS catalog_categories_owner_admin_update ON public.menu_categories;
DROP POLICY IF EXISTS catalog_categories_owner_admin_delete ON public.menu_categories;
CREATE POLICY catalog_categories_owner_admin_select
  ON public.menu_categories FOR SELECT TO authenticated
  USING (public.can_manage_restaurant(restaurant_id));
CREATE POLICY catalog_categories_owner_admin_insert
  ON public.menu_categories FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_restaurant(restaurant_id));
CREATE POLICY catalog_categories_owner_admin_update
  ON public.menu_categories FOR UPDATE TO authenticated
  USING (public.can_manage_restaurant(restaurant_id))
  WITH CHECK (public.can_manage_restaurant(restaurant_id));
CREATE POLICY catalog_categories_owner_admin_delete
  ON public.menu_categories FOR DELETE TO authenticated
  USING (public.can_manage_restaurant(restaurant_id));

DROP POLICY IF EXISTS catalog_items_owner_admin_select ON public.menu_items;
DROP POLICY IF EXISTS catalog_items_owner_admin_insert ON public.menu_items;
DROP POLICY IF EXISTS catalog_items_owner_admin_update ON public.menu_items;
DROP POLICY IF EXISTS catalog_items_owner_admin_delete ON public.menu_items;
CREATE POLICY catalog_items_owner_admin_select
  ON public.menu_items FOR SELECT TO authenticated
  USING (public.can_manage_menu_category(category_id));
CREATE POLICY catalog_items_owner_admin_insert
  ON public.menu_items FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_menu_category(category_id));
CREATE POLICY catalog_items_owner_admin_update
  ON public.menu_items FOR UPDATE TO authenticated
  USING (public.can_manage_menu_category(category_id))
  WITH CHECK (public.can_manage_menu_category(category_id));
CREATE POLICY catalog_items_owner_admin_delete
  ON public.menu_items FOR DELETE TO authenticated
  USING (public.can_manage_menu_category(category_id));

DROP POLICY IF EXISTS catalog_option_groups_owner_admin_all ON public.menu_option_groups;
CREATE POLICY catalog_option_groups_owner_admin_all
  ON public.menu_option_groups FOR ALL TO authenticated
  USING (public.can_manage_menu_item(menu_item_id))
  WITH CHECK (public.can_manage_menu_item(menu_item_id));

DROP POLICY IF EXISTS catalog_options_owner_admin_all ON public.menu_item_options;
CREATE POLICY catalog_options_owner_admin_all
  ON public.menu_item_options FOR ALL TO authenticated
  USING (public.can_manage_menu_item(menu_item_id))
  WITH CHECK (public.can_manage_menu_item(menu_item_id));

DROP POLICY IF EXISTS catalog_gallery_owner_admin_all ON public.restaurant_gallery;
CREATE POLICY catalog_gallery_owner_admin_all
  ON public.restaurant_gallery FOR ALL TO authenticated
  USING (public.can_manage_restaurant(restaurant_id))
  WITH CHECK (public.can_manage_restaurant(restaurant_id));

DROP POLICY IF EXISTS catalog_audits_owner_admin_select ON public.catalog_publication_audits;
DROP POLICY IF EXISTS catalog_audits_admin_insert ON public.catalog_publication_audits;
DROP POLICY IF EXISTS catalog_audits_admin_update ON public.catalog_publication_audits;
DROP POLICY IF EXISTS catalog_audits_admin_delete ON public.catalog_publication_audits;
CREATE POLICY catalog_audits_owner_admin_select
  ON public.catalog_publication_audits FOR SELECT TO authenticated
  USING (public.can_manage_restaurant(restaurant_id));
CREATE POLICY catalog_audits_admin_insert
  ON public.catalog_publication_audits FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY catalog_audits_admin_update
  ON public.catalog_publication_audits FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY catalog_audits_admin_delete
  ON public.catalog_publication_audits FOR DELETE TO authenticated
  USING (public.is_admin());

-- Remove dangerous table-level capabilities. RLS does not protect TRUNCATE, TRIGGER or
-- REFERENCES, so those privileges must never remain on browser roles.
REVOKE ALL PRIVILEGES ON TABLE
  public.restaurants,
  public.menu_sections,
  public.menu_categories,
  public.menu_items,
  public.menu_option_groups,
  public.menu_item_options,
  public.restaurant_gallery,
  public.catalog_publication_audits
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.restaurants,
  public.menu_sections,
  public.menu_categories,
  public.menu_items,
  public.menu_option_groups,
  public.menu_item_options,
  public.restaurant_gallery
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.catalog_publication_audits TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  public.restaurants,
  public.menu_sections,
  public.menu_categories,
  public.menu_items,
  public.menu_option_groups,
  public.menu_item_options,
  public.restaurant_gallery,
  public.catalog_publication_audits
TO service_role;

-- One diagnostic row per restaurant. This is intentionally private: it includes
-- unpublished inventory and blocker reasons. Operations reads it with service_role.
CREATE OR REPLACE VIEW public.catalog_restaurant_readiness
WITH (security_barrier = true, security_invoker = false)
AS
WITH option_price AS (
  SELECT
    mio.menu_item_id,
    bool_or(
      COALESCE(mio.is_available, true)
      AND COALESCE(mio.is_searchable_variant, false)
      AND COALESCE(mio.price, mio.price_delta) IS NOT NULL
    ) AS has_searchable_price
  FROM public.menu_item_options AS mio
  GROUP BY mio.menu_item_id
),
item_rollup AS (
  SELECT
    mc.restaurant_id,
    count(DISTINCT mc.id) FILTER (
      WHERE COALESCE(mc.is_active, true)
    )::bigint AS active_category_count,
    count(DISTINCT mi.id) FILTER (
      WHERE COALESCE(mc.is_active, true)
        AND COALESCE(mi.is_active, true)
        AND COALESCE(mi.is_public_searchable, true)
    )::bigint AS searchable_item_count,
    count(DISTINCT mi.id) FILTER (
      WHERE COALESCE(mc.is_active, true)
        AND COALESCE(mi.is_active, true)
        AND COALESCE(mi.is_public_searchable, true)
        AND COALESCE(mi.is_illustrative, false) = false
        AND COALESCE(mi.needs_review, false) = false
        AND NULLIF(btrim(mi.source_url), '') IS NOT NULL
        AND (
          COALESCE(
            mi.promotional_price,
            mi.display_price,
            mi.price_min,
            mi.price,
            mi.price_max
          ) IS NOT NULL
          OR mi.price_type IN ('free', 'included')
          OR COALESCE(op.has_searchable_price, false)
        )
    )::bigint AS eligible_item_count
  FROM public.menu_categories AS mc
  LEFT JOIN public.menu_items AS mi ON mi.category_id = mc.id
  LEFT JOIN option_price AS op ON op.menu_item_id = mi.id
  GROUP BY mc.restaurant_id
)
SELECT
  r.id AS restaurant_id,
  r.name AS restaurant_name,
  r.city,
  r.state,
  r.neighborhood,
  COALESCE(r.is_deleted, false) AS is_deleted,
  COALESCE(r.is_published, false) AS is_published,
  COALESCE(r.ai_validated, false) AS ai_validated,
  r.menu_status,
  a.status AS audit_status,
  a.audit_method,
  a.audited_at,
  a.source_checked_at,
  COALESCE(ir.active_category_count, 0)::bigint AS active_category_count,
  COALESCE(ir.searchable_item_count, 0)::bigint AS searchable_item_count,
  COALESCE(ir.eligible_item_count, 0)::bigint AS eligible_item_count,
  (
    COALESCE(r.is_deleted, false) = false
    AND r.latitude IS NOT NULL
    AND r.longitude IS NOT NULL
    AND r.location_verified_at IS NOT NULL
    AND r.menu_status = 'found'
    AND COALESCE(r.ai_validated, false)
    AND NULLIF(btrim(r.category), '') IS NOT NULL
    AND (
      NULLIF(btrim(r.phone), '') IS NOT NULL
      OR NULLIF(btrim(r.whatsapp_url), '') IS NOT NULL
    )
    AND COALESCE(ir.eligible_item_count, 0) > 0
    AND a.status = 'approved'
    AND a.audited_at IS NOT NULL
    AND a.source_checked_at IS NOT NULL
  ) AS is_catalog_ready,
  (
    COALESCE(r.is_published, false)
    AND COALESCE(r.is_deleted, false) = false
    AND r.latitude IS NOT NULL
    AND r.longitude IS NOT NULL
    AND r.location_verified_at IS NOT NULL
    AND r.menu_status = 'found'
    AND COALESCE(r.ai_validated, false)
    AND NULLIF(btrim(r.category), '') IS NOT NULL
    AND (
      NULLIF(btrim(r.phone), '') IS NOT NULL
      OR NULLIF(btrim(r.whatsapp_url), '') IS NOT NULL
    )
    AND COALESCE(ir.eligible_item_count, 0) > 0
    AND a.status = 'approved'
    AND a.audited_at IS NOT NULL
    AND a.source_checked_at IS NOT NULL
  ) AS is_publicly_eligible,
  array_remove(ARRAY[
    CASE WHEN COALESCE(r.is_deleted, false) THEN 'deleted' END,
    CASE WHEN r.latitude IS NULL OR r.longitude IS NULL THEN 'not_geocoded' END,
    CASE WHEN r.location_verified_at IS NULL THEN 'location_not_verified' END,
    CASE WHEN r.menu_status IS DISTINCT FROM 'found' THEN 'menu_not_found' END,
    CASE WHEN COALESCE(r.ai_validated, false) = false THEN 'ai_not_validated' END,
    CASE WHEN NULLIF(btrim(r.category), '') IS NULL THEN 'missing_category' END,
    CASE WHEN COALESCE(ir.active_category_count, 0) = 0 THEN 'no_active_category' END,
    CASE WHEN COALESCE(ir.searchable_item_count, 0) = 0 THEN 'no_searchable_item' END,
    CASE WHEN COALESCE(ir.eligible_item_count, 0) = 0 THEN 'no_priced_sourced_item' END,
    CASE WHEN NULLIF(btrim(r.phone), '') IS NULL
              AND NULLIF(btrim(r.whatsapp_url), '') IS NULL
         THEN 'missing_official_contact' END,
    CASE WHEN a.status IS DISTINCT FROM 'approved' THEN 'audit_not_approved' END,
    CASE WHEN a.source_checked_at IS NULL THEN 'source_not_checked' END,
    CASE WHEN COALESCE(r.is_published, false) = false THEN 'not_published' END
  ]::text[], NULL::text) AS blockers
FROM public.restaurants AS r
LEFT JOIN item_rollup AS ir ON ir.restaurant_id = r.id
LEFT JOIN public.catalog_publication_audits AS a ON a.restaurant_id = r.id;

COMMENT ON VIEW public.catalog_restaurant_readiness IS
  'Private deterministic readiness contract. Publication is a final gate, separate from catalog readiness.';

REVOKE ALL PRIVILEGES ON TABLE public.catalog_restaurant_readiness
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.catalog_restaurant_readiness TO service_role;

-- Safe restaurant projection. It deliberately omits owner IDs, email, CNPJ, claim code,
-- logs, contact candidates and all other operational/private fields.
CREATE OR REPLACE VIEW public.public_catalog_restaurants
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  r.id,
  r.name,
  r.description,
  r.image_url,
  r.cover_image_url,
  r.category,
  r.phone,
  r.whatsapp_url,
  r.ifood_url,
  r.other_url,
  r.other_url_label,
  r.address,
  r.number,
  r.neighborhood,
  r.city,
  r.state,
  r.cep,
  r.latitude,
  r.longitude,
  r.opening_hours,
  r.payment_methods,
  r.social_networks,
  r.plan,
  rr.eligible_item_count AS public_item_count,
  rr.source_checked_at AS menu_verified_at
FROM public.restaurants AS r
JOIN public.catalog_restaurant_readiness AS rr
  ON rr.restaurant_id = r.id
WHERE rr.is_publicly_eligible;

COMMENT ON VIEW public.public_catalog_restaurants IS
  'Public restaurant projection containing only published, eligible and audited catalog records.';

REVOKE ALL PRIVILEGES ON TABLE public.public_catalog_restaurants
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.public_catalog_restaurants TO anon, authenticated, service_role;

COMMIT;
