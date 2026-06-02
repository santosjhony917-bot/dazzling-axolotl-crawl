import { useAuthData } from '@/context/AuthContext';

export function useUserRole() {
  const { isPremium, isAdmin, isLoading } = useAuthData();

  return {
    isPremium,
    isAdmin,
    isLoading,
  };
}