import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to provide general authentication data and derived properties like premium status.
 * NOTE: isPremium is currently hardcoded as false.
 */
export const useAuthData = () => {
  const { user, isLoading } = useAuth();

  // Placeholder logic: In a real app, this would check user metadata or a 'plans' table.
  const isPremium = false; 

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isPremium,
  };
};