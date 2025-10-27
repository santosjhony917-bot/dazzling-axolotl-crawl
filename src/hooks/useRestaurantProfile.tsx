import { useAuthContext } from '@/context/AuthContext';
import { Restaurant } from '@/types/supabase';

/**
 * Hook para acessar o restaurante do usuário logado.
 */
export function useRestaurantProfile() {
  const { restaurant, isLoading, refetchProfile } = useAuthContext();

  const isPremium = restaurant?.plan === 'premium' || false;

  return {
    restaurant: restaurant as Restaurant | null,
    isLoading,
    isPremium,
    refetchProfile,
  };
}