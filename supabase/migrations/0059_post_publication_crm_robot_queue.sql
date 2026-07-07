-- CRM post-publication foundation.
-- This migration keeps restaurants as the public/app source of truth and
-- commercial_leads/commercial_events as the commercial source of truth.

DO $$
BEGIN
  ALTER TYPE public.pipeline_stage_enum ADD VALUE IF NOT EXISTS 'PublishedReady';
  ALTER TYPE public.pipeline_stage_enum ADD VALUE IF NOT EXISTS 'Queued';
  ALTER TYPE public.pipeline_stage_enum ADD VALUE IF NOT EXISTS 'Contacted';
  ALTER TYPE public.pipeline_stage_enum ADD VALUE IF NOT EXISTS 'Responded';
  ALTER TYPE public.pipeline_stage_enum ADD VALUE IF NOT EXISTS 'Handoff';
  ALTER TYPE public.pipeline_stage_enum ADD VALUE IF NOT EXISTS 'OptOut';
  ALTER TYPE public.pipeline_stage_enum ADD VALUE IF NOT EXISTS 'Blocked';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.crm_robot_job_status_enum AS ENUM (
    'pending',
    'scheduled',
    'running',
    'waiting_external',
    'succeeded',
    'failed',
    'retrying',
    'cancelled',
    'needs_human'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.commercial_leads
  ADD COLUMN IF NOT EXISTS primary_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_url text,
  ADD COLUMN IF NOT EXISTS contact_source text,
  ADD COLUMN IF NOT EXISTS public_profile_url text,
  ADD COLUMN IF NOT EXISTS opt_out_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_event_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS next_action_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS handoff_reason text,
  ADD COLUMN IF NOT EXISTS automation_paused_reason text,
  ADD COLUMN IF NOT EXISTS crm_notes text;

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.commercial_leads(id) ON DELETE CASCADE NOT NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  kind text DEFAULT 'phone' NOT NULL,
  phone text,
  whatsapp_url text,
  source text,
  source_url text,
  confidence double precision DEFAULT 0,
  is_primary boolean DEFAULT false NOT NULL,
  consent_status text DEFAULT 'discovered' NOT NULL,
  opt_out_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.crm_robot_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.commercial_leads(id) ON DELETE CASCADE NOT NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  job_type text NOT NULL,
  status public.crm_robot_job_status_enum DEFAULT 'pending'::public.crm_robot_job_status_enum NOT NULL,
  channel text DEFAULT 'whatsapp' NOT NULL,
  provider text DEFAULT 'geelark' NOT NULL,
  scheduled_at timestamp with time zone DEFAULT now() NOT NULL,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  attempts integer DEFAULT 0 NOT NULL,
  max_attempts integer DEFAULT 3 NOT NULL,
  locked_at timestamp with time zone,
  last_error text,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  result jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.crm_agent_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.commercial_leads(id) ON DELETE CASCADE NOT NULL,
  robot_job_id uuid REFERENCES public.crm_robot_jobs(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.crm_ai_agents(id) ON DELETE SET NULL,
  role_name text NOT NULL,
  model text,
  prompt_version text,
  input jsonb DEFAULT '{}'::jsonb NOT NULL,
  output jsonb DEFAULT '{}'::jsonb NOT NULL,
  evaluation jsonb DEFAULT '{}'::jsonb NOT NULL,
  status text DEFAULT 'draft' NOT NULL,
  error_message text,
  token_usage jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.crm_handoffs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.commercial_leads(id) ON DELETE CASCADE NOT NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'open' NOT NULL,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at timestamp with time zone DEFAULT now() NOT NULL,
  closed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_commercial_leads_last_event ON public.commercial_leads(last_event_at DESC);
CREATE INDEX IF NOT EXISTS idx_commercial_leads_opt_out ON public.commercial_leads(opt_out_at) WHERE opt_out_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_lead_primary ON public.crm_contacts(lead_id, is_primary);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contacts_unique_source
  ON public.crm_contacts(lead_id, coalesce(phone, ''), coalesce(whatsapp_url, ''), coalesce(source, ''));
CREATE INDEX IF NOT EXISTS idx_crm_robot_jobs_status_schedule ON public.crm_robot_jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_crm_robot_jobs_lead ON public.crm_robot_jobs(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_agent_runs_lead ON public.crm_agent_runs(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_handoffs_status ON public.crm_handoffs(status, opened_at DESC);

DROP TRIGGER IF EXISTS update_crm_contacts_updated_at ON public.crm_contacts;
CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commercial_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_robot_jobs_updated_at ON public.crm_robot_jobs;
CREATE TRIGGER update_crm_robot_jobs_updated_at
  BEFORE UPDATE ON public.crm_robot_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commercial_updated_at_column();

ALTER TABLE public.crm_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_robot_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_agent_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_handoffs DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.crm_digits(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(value, ''), '\D', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.crm_primary_contact_payload(p_restaurant public.restaurants)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  candidate jsonb;
  phone_digits text;
  wa_url text;
BEGIN
  IF coalesce(p_restaurant.whatsapp_url, '') <> '' THEN
    phone_digits := public.crm_digits(p_restaurant.whatsapp_url);
    RETURN jsonb_build_object(
      'phone', nullif(phone_digits, ''),
      'whatsapp_url', p_restaurant.whatsapp_url,
      'source', coalesce(p_restaurant.primary_contact_source, 'restaurant.whatsapp_url'),
      'kind', 'whatsapp',
      'confidence', 1
    );
  END IF;

  IF coalesce(p_restaurant.phone, '') <> '' THEN
    phone_digits := public.crm_digits(p_restaurant.phone);
    RETURN jsonb_build_object(
      'phone', nullif(phone_digits, ''),
      'whatsapp_url', CASE WHEN length(phone_digits) >= 10 THEN 'https://wa.me/55' || phone_digits ELSE null END,
      'source', coalesce(p_restaurant.primary_contact_source, 'restaurant.phone'),
      'kind', 'phone',
      'confidence', 0.7
    );
  END IF;

  SELECT c.value
  INTO candidate
  FROM jsonb_array_elements(coalesce(p_restaurant.contact_candidates, '[]'::jsonb)) AS c(value)
  WHERE coalesce(c.value->>'normalized_phone', c.value->>'phone', '') <> ''
  ORDER BY
    CASE WHEN c.value->>'kind' = 'whatsapp' OR coalesce(c.value->>'whatsapp_url', '') <> '' THEN 0 ELSE 1 END,
    CASE WHEN coalesce(c.value->>'score', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN (c.value->>'score')::numeric ELSE 0 END DESC
  LIMIT 1;

  IF candidate IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  phone_digits := public.crm_digits(coalesce(candidate->>'normalized_phone', candidate->>'phone'));
  wa_url := nullif(candidate->>'whatsapp_url', '');
  IF wa_url IS NULL AND length(phone_digits) >= 10 THEN
    wa_url := 'https://wa.me/55' || phone_digits;
  END IF;

  RETURN jsonb_build_object(
    'phone', nullif(phone_digits, ''),
    'whatsapp_url', wa_url,
    'source', coalesce(candidate->>'source', candidate->>'source_url', 'contact_candidates'),
    'source_url', candidate->>'source_url',
    'kind', coalesce(candidate->>'kind', 'phone'),
    'confidence', CASE WHEN coalesce(candidate->>'confidence', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN (candidate->>'confidence')::numeric ELSE 0.65 END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_post_publication_commercial_lead(p_restaurant public.restaurants)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contact jsonb;
  v_lead_id uuid;
  next_stage public.pipeline_stage_enum;
  profile_url text;
BEGIN
  IF coalesce(p_restaurant.is_deleted, false) = true
     OR coalesce(p_restaurant.is_published, false) = false
     OR coalesce(p_restaurant.ai_validated, false) = false
     OR coalesce(p_restaurant.menu_status, '') <> 'found' THEN
    RETURN NULL;
  END IF;

  contact := public.crm_primary_contact_payload(p_restaurant);
  IF coalesce(contact->>'phone', '') = '' AND coalesce(contact->>'whatsapp_url', '') = '' THEN
    RETURN NULL;
  END IF;

  profile_url := '/restaurant/' || p_restaurant.id::text;
  -- Use an already existing enum value inside this migration. The UI may move
  -- leads to PublishedReady after the enum addition is committed.
  next_stage := 'Uncontacted'::public.pipeline_stage_enum;

  INSERT INTO public.commercial_leads (
    restaurant_id,
    score,
    pipeline_stage,
    sentiment,
    is_ai_active,
    primary_phone,
    whatsapp_url,
    contact_source,
    public_profile_url,
    last_event_at
  )
  VALUES (
    p_restaurant.id,
    60,
    next_stage,
    'Neutral'::public.lead_sentiment_enum,
    true,
    contact->>'phone',
    contact->>'whatsapp_url',
    contact->>'source',
    profile_url,
    now()
  )
  ON CONFLICT (restaurant_id) DO UPDATE SET
    primary_phone = coalesce(EXCLUDED.primary_phone, public.commercial_leads.primary_phone),
    whatsapp_url = coalesce(EXCLUDED.whatsapp_url, public.commercial_leads.whatsapp_url),
    contact_source = coalesce(EXCLUDED.contact_source, public.commercial_leads.contact_source),
    public_profile_url = EXCLUDED.public_profile_url,
    last_event_at = coalesce(public.commercial_leads.last_event_at, EXCLUDED.last_event_at),
    pipeline_stage = CASE
      WHEN public.commercial_leads.pipeline_stage IN (
        'Uncontacted'::public.pipeline_stage_enum,
        'Nurturing'::public.pipeline_stage_enum
      ) THEN EXCLUDED.pipeline_stage
      ELSE public.commercial_leads.pipeline_stage
    END
  RETURNING id INTO v_lead_id;

  INSERT INTO public.crm_contacts (
    lead_id,
    restaurant_id,
    kind,
    phone,
    whatsapp_url,
    source,
    source_url,
    confidence,
    is_primary
  )
  VALUES (
    v_lead_id,
    p_restaurant.id,
    coalesce(contact->>'kind', 'phone'),
    contact->>'phone',
    contact->>'whatsapp_url',
    contact->>'source',
    contact->>'source_url',
    coalesce((contact->>'confidence')::double precision, 0.65),
    true
  )
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.commercial_events
    WHERE commercial_events.lead_id = v_lead_id
      AND event_type = 'RestaurantPublishedForCrm'
  ) THEN
    INSERT INTO public.commercial_events (lead_id, event_type, actor_type, payload)
    VALUES (
      v_lead_id,
      'RestaurantPublishedForCrm',
      'System'::public.event_actor_type_enum,
      jsonb_build_object(
        'restaurant_id', p_restaurant.id,
        'restaurant_name', p_restaurant.name,
        'city', p_restaurant.city,
        'state', p_restaurant.state,
        'menu_status', p_restaurant.menu_status,
        'contact_source', contact->>'source',
        'public_profile_url', profile_url
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.crm_robot_jobs
    WHERE crm_robot_jobs.lead_id = v_lead_id
      AND job_type = 'first_contact'
      AND status IN ('pending', 'scheduled', 'running', 'waiting_external', 'retrying')
  ) THEN
    INSERT INTO public.crm_robot_jobs (
      lead_id,
      restaurant_id,
      job_type,
      status,
      channel,
      provider,
      scheduled_at,
      payload
    )
    VALUES (
      v_lead_id,
      p_restaurant.id,
      'first_contact',
      'pending'::public.crm_robot_job_status_enum,
      'whatsapp',
      'geelark',
      now(),
      jsonb_build_object(
        'restaurant_name', p_restaurant.name,
        'city', p_restaurant.city,
        'state', p_restaurant.state,
        'neighborhood', p_restaurant.neighborhood,
        'phone', contact->>'phone',
        'whatsapp_url', contact->>'whatsapp_url',
        'public_profile_url', profile_url
      )
    );
  END IF;

  RETURN v_lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_post_publication_commercial_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_post_publication_commercial_lead(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_post_publication_commercial_lead ON public.restaurants;
CREATE TRIGGER trigger_post_publication_commercial_lead
  AFTER INSERT OR UPDATE OF is_published, ai_validated, menu_status, phone, whatsapp_url, contact_candidates, is_deleted
  ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_post_publication_commercial_lead();

-- Backfill existing published, validated restaurants into the new CRM layer.
DO $$
DECLARE
  r public.restaurants;
BEGIN
  FOR r IN
    SELECT * FROM public.restaurants
    WHERE coalesce(is_deleted, false) = false
      AND coalesce(is_published, false) = true
      AND coalesce(ai_validated, false) = true
      AND coalesce(menu_status, '') = 'found'
  LOOP
    PERFORM public.sync_post_publication_commercial_lead(r);
  END LOOP;
EXCEPTION
  WHEN others THEN
    -- Keep migration resilient; the trigger will populate future publications.
    RAISE NOTICE 'CRM backfill skipped: %', SQLERRM;
END $$;
