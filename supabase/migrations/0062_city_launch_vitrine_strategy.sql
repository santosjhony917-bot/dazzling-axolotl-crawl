-- City launch vitrine + CRM strategy.
-- Keeps public visual strategy separate from paid subscription state.

CREATE TABLE IF NOT EXISTS public.city_launch_strategy (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  city_slug text NOT NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  strategic_group text DEFAULT 'long_tail' NOT NULL,
  visual_status text DEFAULT 'basic' NOT NULL,
  crm_wave integer DEFAULT 0 NOT NULL,
  commercial_score integer DEFAULT 0 NOT NULL,
  followers_count integer DEFAULT 0 NOT NULL,
  trial_days integer DEFAULT 14 NOT NULL,
  trial_ends_at timestamp with time zone,
  reason text,
  applied_at timestamp with time zone,
  sent_to_crm_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (city_slug, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_city_launch_strategy_city_group
  ON public.city_launch_strategy(city_slug, strategic_group);

CREATE INDEX IF NOT EXISTS idx_city_launch_strategy_city_visual
  ON public.city_launch_strategy(city_slug, visual_status);

CREATE INDEX IF NOT EXISTS idx_city_launch_strategy_wave
  ON public.city_launch_strategy(city_slug, crm_wave, sent_to_crm_at);

DROP TRIGGER IF EXISTS update_city_launch_strategy_updated_at ON public.city_launch_strategy;
CREATE TRIGGER update_city_launch_strategy_updated_at
  BEFORE UPDATE ON public.city_launch_strategy
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commercial_updated_at_column();

ALTER TABLE public.city_launch_strategy DISABLE ROW LEVEL SECURITY;
