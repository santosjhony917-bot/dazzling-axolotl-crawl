import { useAuthContext } from '@/context/AuthContext';

export function useUserRole() {
  const { isPremium, isAdmin, isLoading } = useAuthContext();

  return {
    isPremium,
    isAdmin,
    isLoading,
  };
}