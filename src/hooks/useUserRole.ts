import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "user" | "restaurant" | "premium_restaurant" | "admin";

interface UseUserRoleResult {
  role: AppRole | null;
  isPremium: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

export function useUserRole(): UseUserRoleResult {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRole = useCallback(async (userId: string) => {
    // In a real application, this would fetch the role from a `user_roles` table
    // For now, we'll use a placeholder logic or check metadata if available.
    // Since we don't have the `user_roles` table schema, we'll assume a default role
    // or check if the user owns a restaurant.

    // Placeholder logic: Check if user owns a restaurant to determine 'restaurant' role
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (restaurantError) {
      console.error("Error checking restaurant ownership:", restaurantError);
    }

    if (restaurantData) {
      if (restaurantData.plan === "premium") {
        setRole("premium_restaurant");
      } else {
        setRole("restaurant");
      }
    } else {
      setRole("user");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        fetchRole(user.id);
      } else {
        setRole(null);
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          fetchRole(session.user.id);
        }
        if (event === "SIGNED_OUT") {
          setRole(null);
          setIsLoading(false);
        }
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [fetchRole]);

  const isPremium = role === "premium_restaurant";
  const isAdmin = role === "admin";

  return { role, isPremium, isAdmin, isLoading };
}