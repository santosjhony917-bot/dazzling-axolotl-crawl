import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import toast from "react-hot-toast";

export type RestaurantPlan = "free" | "basic" | "premium";

export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  address: string | null;
  plan: RestaurantPlan;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  neighborhood: string | null;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  category: string | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  opening_hours: any | null; // Assuming JSONB structure
  cover_image_url: string | null;
}

interface UseRestaurantResult {
  restaurant: Restaurant | null;
  isLoading: boolean;
  error: Error | null;
  updateRestaurantField: (key: keyof Restaurant, value: string | number | null) => Promise<void>;
  refetch: () => void;
}

export function useRestaurant(): UseRestaurantResult {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRestaurant = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching restaurant:", error);
      setError(new Error(error.message));
      setRestaurant(null);
      toast.error("Falha ao carregar dados do restaurante.");
    } else {
      setRestaurant(data as Restaurant);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  const updateRestaurantField = useCallback(
    async (key: keyof Restaurant, value: string | number | null) => {
      if (!restaurant) return;

      const loadingToast = toast.loading("Salvando...");

      const updatePayload = { [key]: value };

      const { error } = await supabase
        .from("restaurants")
        .update(updatePayload)
        .eq("id", restaurant.id);

      toast.dismiss(loadingToast);

      if (error) {
        console.error("Error updating restaurant field:", error);
        toast.error("Falha ao atualizar: " + error.message);
      } else {
        setRestaurant((prev) =>
          prev ? { ...prev, [key]: value } : null,
        );
        toast.success("Atualizado com sucesso!");
      }
    },
    [restaurant],
  );

  return { restaurant, isLoading, error, updateRestaurantField, refetch: fetchRestaurant };
}