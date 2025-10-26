import { useAuthContext } from '@/context/AuthContext';
import { useUserData } from './useAuthProfile'; // Importando o hook centralizado

export function useAuth() {
  const { user, isLoading: isAuthLoading, signOut } = useAuthContext();
  const { isAdmin, isPremium, restaurant, profile, isLoading: isProfileLoading, refetchProfile } = useUserData();

  return {
    user,
    isLoading: isAuthLoading || isProfileLoading,
    signOut,
    isAdmin,
    isPremium,
    isAuthenticated: !!user,
    restaurant,
    profile,
    refetchProfile,
  };
}