import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategoryWithItems } from '@/types/supabase';
import { showError } from '@/utils/toast';