import { useAuthContext } from '@/context/AuthContext';

/**
 * Hook para verificar o papel e status do plano do usuário.
 */
export function useUserRole() {
  const { isPremium, isAdmin, isLoading } = useAuthContext();

  return {
    isPremium,
    isAdmin,
    isLoading,
  };
}