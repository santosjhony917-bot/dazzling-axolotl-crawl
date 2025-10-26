import { useAuthContext } from '@/context/AuthContext';

export function useAuth() {
  const { user, isLoading, signOut, isAdmin, isPremium, restaurant } = useAuthContext();

  return {
    user,
    isLoading,
    signOut,
    isAdmin,
    isPremium,
    restaurant,
    isAuthenticated: !!user,
  };
}