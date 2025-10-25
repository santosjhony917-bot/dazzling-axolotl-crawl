import { useAuthContext } from '@/context/AuthContext';

export function useAuth() {
  const { user, isLoading, signOut, isAdmin, isPremium } = useAuthContext();

  return {
    user,
    isLoading,
    signOut,
    isAdmin,
    isPremium,
    isAuthenticated: !!user,
  };
}