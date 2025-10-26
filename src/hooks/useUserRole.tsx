import { useUserData } from './useAuthProfile';

export function useUserRole() {
  const { isPremium, isAdmin, isLoading, isAuthenticated } = useUserData();

  return {
    isPremium,
    isAdmin,
    isLoading,
    isAuthenticated,
  };
}