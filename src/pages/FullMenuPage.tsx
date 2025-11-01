"use client";

import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PublicRestaurantData } from '@/types/restaurant';
import { MenuCategoryWithItems } from '@/types/supabase';
import { fetchPublicRestaurantById, fetchRestaurantMenu } from '@/integrations/supabase/restaurants';
import RestaurantMenu from '@/components/public/RestaurantMenu';
import { Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';

const FullMenuPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();

  const { data: restaurant, isLoading: isLoadingRestaurant, error: errorRestaurant } = useQuery<PublicRestaurantData | null, Error>({
    queryKey: ['publicRestaurant', restaurantId],
    queryFn: () => fetchPublicRestaurantById(restaurantId!),
    enabled: !!restaurantId,
  });

  const { data: menuCategories, isLoading: isLoadingMenu, error: errorMenu } = useQuery<MenuCategoryWithItems[] | null, Error>({
    queryKey: ['restaurantMenu', restaurantId],
    queryFn: async () => {
      const data = await fetchRestaurantMenu(restaurantId!);
      return data?.map(category => ({
        ...category,
        menu_items: (category as MenuCategoryWithItems).menu_items || []
      })) || null;
    },
    enabled: !!restaurantId,
  });

  if (isLoadingRestaurant || isLoadingMenu) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (errorRestaurant || errorMenu) {
    showError('Erro ao carregar o menu completo do restaurante.');
    return (
      <div className="text-center text-red-500 py-8">
        <p>Não foi possível carregar o menu. Por favor, tente novamente mais tarde.</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>Restaurante não encontrado.</p>
      </div>
    );
  }

  const hasMenu = menuCategories && menuCategories.length > 0;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Cardápio Completo de {restaurant.name}</h1>

      {!hasMenu ? (
        <div className="text-center text-gray-500 py-8">
          <p>Este restaurante ainda não possui um cardápio.</p>
        </div>
      ) : (
        <RestaurantMenu
            menuCategories={menuCategories || []}
          />
      )}
    </div>
  );
};

export default FullMenuPage;