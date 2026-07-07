-- CRM invalid contact stage.
-- Used when a collected phone/WhatsApp cannot be reached or belongs to the wrong contact.

DO $$
BEGIN
  ALTER TYPE public.pipeline_stage_enum ADD VALUE IF NOT EXISTS 'InvalidContact';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.commercial_leads
  ADD COLUMN IF NOT EXISTS contact_invalid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS contact_invalid_reason text;

CREATE INDEX IF NOT EXISTS idx_commercial_leads_invalid_contact
  ON public.commercial_leads(contact_invalid_at DESC)
  WHERE contact_invalid_at IS NOT NULL;
