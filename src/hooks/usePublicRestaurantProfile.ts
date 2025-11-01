import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantPlan } from '@/types/supabase';
import { fetchPublicRestaurantById } from '@/integrations/supabase/restaurants';