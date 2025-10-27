import { useAuthContext } from '@/context/AuthContext';

export function useAuth() {
  const { user, isLoading, signOut, isAdmin, isPremium, restaurant, profile, isProfileLoading, isAuthenticated } = useAuthContext();

  return {
    user,
    isLoading,
    signOut,
    isAdmin,
    isPremium,
    restaurant,
    profile,
    isAuthenticated,
    isProfileLoading,
  };
}