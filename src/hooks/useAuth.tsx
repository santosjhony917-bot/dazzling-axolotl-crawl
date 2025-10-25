import { useAuthContext } from '@/context/AuthContext';

export function useAuth() {
  const { user, isLoading, signOut } = useAuthContext();
  
  // Retorna apenas as funções básicas de autenticação para compatibilidade
  return {
    user,
    isLoading,
    signOut,
  };
}