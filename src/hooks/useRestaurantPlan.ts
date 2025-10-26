import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RestaurantPlan } from '@/types/supabase';

interface RestaurantPlanData {
  plan: RestaurantPlan;
  isPremium: boolean;
  isFree: boolean;
}

const defaultPlan: RestaurantPlanData = {
  plan: 'free',
  isPremium: false,
  isFree: true,
};

/**
 * Hook para buscar o plano do restaurante do usuário logado.
 * Retorna o plano e flags de status (isPremium, isFree).
 */
export const useRestaurantPlan = () => {
  const { data: user } = useQuery({
    queryKey: ['sessionUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: Infinity,
  });

  const userId = user?.id;

  return useQuery<RestaurantPlanData, Error>({
    queryKey: ['userRestaurantPlan', userId],
    queryFn: async () => {
      if (!userId) {
        return defaultPlan;
      }

      // Busca o restaurante associado ao user_id
      const { data, error } = await supabase
        .from('restaurants')
        .select('plan')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        throw new Error(error.message);
      }

      const plan = data?.plan || 'free';
      const isPremium = plan === 'premium' || plan === 'premium_gift';
      const isFree = plan === 'free';

      return {
        plan,
        isPremium,
        isFree,
      };
    },
    enabled: !!userId,
    initialData: defaultPlan,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};