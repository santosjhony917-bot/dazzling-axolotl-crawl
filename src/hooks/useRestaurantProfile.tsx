import { useAuthContext } from '@/context/AuthContext';

export function useRestaurantProfile() {
  const { restaurant, isLoading, refetchProfile } = useAuthContext();

  return {
    restaurant,
    isLoading,
    refetchProfile,
  };
}