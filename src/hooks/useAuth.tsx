import { useAuthContext } from '@/context/AuthContext';

export function useAuth() {
  const { user, isLoading, signOut, isAdmin, isPremium } = useAuthContext();
  
  // Retorna apenas as funções básicas de autenticação para compatibilidade
  return {
    user,
    isLoading,
    signOut,
    isAdmin,
    isPremium,
  };
}