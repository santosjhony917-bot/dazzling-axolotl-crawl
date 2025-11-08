"use client";

import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PremiumProfileLayout from "@/components/public/PremiumProfileLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicRestaurantData } from "@/types/restaurant";

const RestaurantProfilePublic = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const queryClient = useQueryClient();
  const [isFavorite, setIsFavorite] = useState(false); // Placeholder for favorite state

  const { data: restaurant, isLoading, error } = useQuery<PublicRestaurantData>({
    queryKey: ["restaurantPublic", restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        throw new Error("ID do restaurante é obrigatório.");
      }
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          `
          *,
          menu_categories (
            *,
            menu_items (*)
          ),
          restaurant_gallery (*)
        `
        )
        .eq("id", restaurantId)
        .single();
      if (error) throw error;
      // The fetched data might not match the full PublicRestaurantData type from types/restaurant.ts
      // We should cast it carefully or adjust the type/query. For now, we cast it.
      return data as unknown as PublicRestaurantData;
    },
    enabled: !!restaurantId,
  });

  // Placeholder for favorite mutation
  const { mutate: toggleFollow, isPending: isFavoriteMutating } = useMutation({
    mutationFn: async () => {
      // Simulate API call
      return new Promise((resolve) => setTimeout(() => resolve(null), 500));
    },
    onSuccess: () => {
      setIsFavorite((prev) => !prev);
      toast.success(isFavorite ? "Removido dos favoritos!" : "Adicionado aos favoritos!");
      queryClient.invalidateQueries({ queryKey: ["restaurantPublic", restaurantId] });
    },
    onError: () => {
      toast.error("Erro ao atualizar favoritos.");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light pt-[96px]">
        <div className="relative h-48 w-full bg-gray-200">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="relative -mt-16 mb-4 px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-32 w-32 rounded-full bg-gray-300 border-4 border-white shadow-md" />
        </div>
        <div className="space-y-6 px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <p className="text-red-500">Erro ao carregar o perfil do restaurante.</p>
      </div>
    );
  }

  return (
    <PremiumProfileLayout
      restaurant={restaurant}
      toggleFavorite={toggleFollow}
      isFavoriteMutating={isFavoriteMutating}
      isCompact={false}
    />
  );
};

export default RestaurantProfilePublic;