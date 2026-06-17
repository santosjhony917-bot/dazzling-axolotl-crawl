-- Migration: 0028_commercial_crm_rebuild.sql
-- Description: Rebuilding the CRM to use Event Sourcing and Clean Architecture.

-- 1. Drop old tables safely
DROP TABLE IF EXISTS public.historico_janelas_24h CASCADE;
DROP TABLE IF EXISTS public.estabelecimentos CASCADE;
DROP TABLE IF EXISTS public.campanhas_lotes CASCADE;
DROP TABLE IF EXISTS public.registro_estrategias_ia CASCADE;
DROP TABLE IF EXISTS public.regioes CASCADE;

DROP TYPE IF EXISTS public.plano_status_enum CASCADE;
DROP TYPE IF EXISTS public.reivindicacao_status_enum CASCADE;
DROP TYPE IF EXISTS public.lead_humor_enum CASCADE;

-- 2. Create Enums for new architecture
CREATE TYPE public.pipeline_stage_enum AS ENUM ('Uncontacted', 'Qualified', 'Negotiating', 'Won', 'Lost', 'Nurturing');
CREATE TYPE public.lead_sentiment_enum AS ENUM ('Positive', 'Neutral', 'Negative', 'Objection', 'Ready');
CREATE TYPE public.campaign_type_enum AS ENUM ('Physical_Letter', 'WhatsApp', 'Email');
CREATE TYPE public.campaign_status_enum AS ENUM ('Draft', 'Active', 'Completed');
CREATE TYPE public.asset_type_enum AS ENUM ('Letter_Template', 'System_Prompt', 'Landing_Page');
CREATE TYPE public.insight_type_enum AS ENUM ('Objection_Identified', 'Success_Pattern', 'Risk_Identified');
CREATE TYPE public.event_actor_type_enum AS ENUM ('System', 'AI', 'Human', 'Lead');

-- 3. Create Commercial Leads (Extends restaurants 1:1)
CREATE TABLE public.commercial_leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE UNIQUE NOT NULL,
    score integer DEFAULT 0,
    pipeline_stage public.pipeline_stage_enum DEFAULT 'Uncontacted'::public.pipeline_stage_enum NOT NULL,
    sentiment public.lead_sentiment_enum DEFAULT 'Neutral'::public.lead_sentiment_enum NOT NULL,
    assigned_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    is_ai_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Create Campaigns
CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    type public.campaign_type_enum NOT NULL,
    status public.campaign_status_enum DEFAULT 'Draft'::public.campaign_status_enum NOT NULL,
    budget_tracking jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. Create Campaign Assets
CREATE TABLE public.campaign_assets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    asset_type public.asset_type_enum NOT NULL,
    content jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. Create QR Trackers (Unique per lead/campaign)
CREATE TABLE public.qr_trackers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid REFERENCES public.commercial_leads(id) ON DELETE CASCADE NOT NULL,
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    short_code text UNIQUE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. Create Commercial Events (EVENT SOURCING CORE)
CREATE TABLE public.commercial_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid REFERENCES public.commercial_leads(id) ON DELETE CASCADE NOT NULL,
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
    event_type text NOT NULL, -- 'LetterSent', 'QRCodeScanned', 'LPOpened', 'WhatsAppMessageReceived', 'ObjectionRaised', 'HandoverRequested', 'PlanPurchased'
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    actor_type public.event_actor_type_enum DEFAULT 'System'::public.event_actor_type_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. Create AI Insights Log
CREATE TABLE public.ai_insights_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid REFERENCES public.commercial_leads(id) ON DELETE CASCADE NOT NULL,
    insight_type public.insight_type_enum NOT NULL,
    description text NOT NULL,
    confidence_score double precision DEFAULT 0.0,
    action_taken text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 9. Indexes for Performance
CREATE INDEX idx_commercial_leads_pipeline ON public.commercial_leads(pipeline_stage);
CREATE INDEX idx_commercial_leads_score ON public.commercial_leads(score DESC);
CREATE INDEX idx_commercial_events_lead_id ON public.commercial_events(lead_id, created_at DESC);
CREATE INDEX idx_commercial_events_type ON public.commercial_events(event_type);
CREATE INDEX idx_qr_trackers_short_code ON public.qr_trackers(short_code);

-- 10. Auto-update Trigger for updated_at
CREATE OR REPLACE FUNCTION update_commercial_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_commercial_leads_updated_at
    BEFORE UPDATE ON public.commercial_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_commercial_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_commercial_updated_at_column();

-- 11. Trigger to automatically create a lead when a new restaurant is created
-- If you want leads to be created automatically for all new restaurants:
CREATE OR REPLACE FUNCTION auto_create_commercial_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create if it doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM public.commercial_leads WHERE restaurant_id = NEW.id) THEN
        INSERT INTO public.commercial_leads (restaurant_id) VALUES (NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_lead
    AFTER INSERT ON public.restaurants
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_commercial_lead();

-- Populate initial leads for existing restaurants
INSERT INTO public.commercial_leads (restaurant_id)
SELECT id FROM public.restaurants
ON CONFLICT (restaurant_id) DO NOTHING;
