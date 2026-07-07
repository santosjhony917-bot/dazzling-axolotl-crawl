-- CRM response quality metrics.
-- Separates generic WhatsApp replies from probable human/operator/owner replies.

ALTER TABLE public.commercial_leads
  ADD COLUMN IF NOT EXISTS last_response_kind text,
  ADD COLUMN IF NOT EXISTS last_response_is_human boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS last_response_summary text,
  ADD COLUMN IF NOT EXISTS response_quality_score double precision DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS human_reply_count integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS auto_reply_count integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS last_human_reply_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_auto_reply_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS owner_identified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS interested_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_commercial_leads_response_kind
  ON public.commercial_leads(last_response_kind);

CREATE INDEX IF NOT EXISTS idx_commercial_leads_human_reply
  ON public.commercial_leads(last_human_reply_at DESC)
  WHERE last_human_reply_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_leads_owner_identified
  ON public.commercial_leads(owner_identified_at DESC)
  WHERE owner_identified_at IS NOT NULL;
