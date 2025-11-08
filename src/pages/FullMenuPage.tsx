"use client";

import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import RestaurantMenu from "@/components/public/RestaurantMenu";
import { cn } from "@/lib/utils";

const containerPxClass = "px-4 sm:px-6 lg:px-8";

const FullMenuPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: restaurant, isLoading, error } = useQuery({
    queryKey: ["restaurantFullMenu", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          `
          id,
          name,
          menu_categories (
            *,
            menu_items (*)
          )
        `
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light pt-[96px]">
        <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10 p-4 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-48" />
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className={cn("space-y-6 mt-8", containerPxClass)}>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-background-light pt-[96px] flex items-center justify-center">
        <p className="text-red-500">Erro ao carregar o cardápio completo.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background-light">
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10 p-4 flex items-center justify-between">
        <Link to={`/restaurants/${id}`} className="text-lg font-bold text-primary">
          &lt; Voltar
        </Link>
        <h1 className="text-xl font-semibold">{restaurant.name} - Cardápio</h1>
        <div className="w-16"></div> {/* Placeholder for alignment */}
      </div>

      <div className={cn("pb-8 pt-[96px]", containerPxClass)}>
        {restaurant.menu_categories && restaurant.menu_categories.length > 0 ? (
          <RestaurantMenu
            restaurantId={restaurant.id}
            menu={restaurant.menu_categories}
          />
        ) : (
          <p className="text-center text-gray-600 mt-8">Nenhum item no cardápio.</p>
        )}
      </div>
    </div>
  );
};

export default FullMenuPage;