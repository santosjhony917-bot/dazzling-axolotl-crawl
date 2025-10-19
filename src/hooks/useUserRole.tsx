import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export type AppRole = 'customer' | 'free_restaurant' | 'premium_restaurant' | 'admin';

interface UserRole {
  user_id: string;
  role: AppRole;
}

const DEFAULT_ROLE: AppRole = 'customer';

export function useUserRole() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    // Fetch user ID initially
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
      setIsInitialLoading(false);
    });
  }, []);

  const { data: roles, isLoading: isRolesLoading, error, refetch } = useQuery<UserRole[], Error>({
    queryKey: ['userRoles', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role, user_id')
        .eq('user_id', userId);

      if (error) throw new Error(error.message);
      return data as UserRole[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache roles for 5 minutes
  });

  // Determine the highest priority role
  const userRoles = roles?.map(r => r.role) || [];
  let currentRole: AppRole = DEFAULT_ROLE;

  if (userRoles.includes('admin')) {
    currentRole = 'admin';
  } else if (userRoles.includes('premium_restaurant')) {
    currentRole = 'premium_restaurant';
  } else if (userRoles.includes('free_restaurant')) {
    currentRole = 'free_restaurant';
  } else if (userRoles.length > 0) {
    // If they have any role, but not the specific ones above, default to customer if not explicitly set
    currentRole = 'customer';
  }

  return {
    role: currentRole,
    isAdmin: currentRole === 'admin',
    isPremiumRestaurant: currentRole === 'premium_restaurant',
    isFreeRestaurant: currentRole === 'free_restaurant',
    isCustomer: currentRole === 'customer',
    isLoading: isInitialLoading || isRolesLoading, // Combine initial loading state
    error,
    refetch,
    userId,
  };
}