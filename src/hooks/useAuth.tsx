import { useAuthContext, AuthContextType } from '@/context/AuthContext';

/**
 * Hook de conveniência para acessar todas as propriedades do AuthContext.
 * @returns {AuthContextType}
 */
export function useAuth(): AuthContextType {
  const { user, isLoading, signOut, isAdmin, isPremium, restaurant, profile, refetchProfile, session } = useAuthContext();
  
  return { user, isLoading, signOut, isAdmin, isPremium, restaurant, profile, refetchProfile, session };
}