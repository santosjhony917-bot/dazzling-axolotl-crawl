-- Migration 0035: Add public_profile_screenshot_url to commercial_leads

ALTER TABLE public.commercial_leads 
ADD COLUMN public_profile_screenshot_url text;
