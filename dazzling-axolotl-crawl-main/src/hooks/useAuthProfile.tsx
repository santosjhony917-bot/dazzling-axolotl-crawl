import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getProfile, getRestaurantByUserId } from '@/integrations/supabase/profile'; // Novo arquivo de integração
import { Profile, Restaurant } from '@/types/supabase'; // Importando Profile e Restaurant de supabase.ts
import { useToast } from '@/components/ui/use-toast';

// ... (restante do arquivo)