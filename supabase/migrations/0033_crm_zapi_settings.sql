-- Migration: 0033_crm_zapi_settings.sql
-- Description: Create settings table for Z-API WhatsApp CRM integration.

CREATE TABLE IF NOT EXISTS public.crm_settings (
    id integer PRIMARY KEY DEFAULT 1 CONSTRAINT single_row CHECK (id = 1),
    zapi_instance_id text,
    zapi_instance_token text,
    zapi_client_token text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Seed initial row
INSERT INTO public.crm_settings (id, zapi_instance_id, zapi_instance_token, zapi_client_token)
VALUES (1, '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Disable RLS to allow easy admin UI read and write access
ALTER TABLE public.crm_settings DISABLE ROW LEVEL SECURITY;
