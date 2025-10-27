import { useAuthContext } from '@/context/AuthContext';

export function useAuth() {
  const { user, isLoading, signOut, isAdmin, isPremium, restaurant, profile } = useAuthContext();

  return {
    user,
    isLoading,
    signOut,
    isAdmin,
    isPremium,
    restaurant,
    profile,
    isAuthenticated: !!user,
  };
}