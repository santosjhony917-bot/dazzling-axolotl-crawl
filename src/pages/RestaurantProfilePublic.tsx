"use client";

import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData } from '@/types/restaurant';
import { MenuCategoryWithItems, GalleryImage } from '@/types/supabase';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';
import { fetchPublicRestaurantById, fetchRestaurantMenu, fetchRestaurantGallery } from '@/integrations/supabase/restaurants';

const RestaurantProfilePublic: React.FC = () => {
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
      // Ensure menu_items are included for MenuCategoryWithItems type
      return data?.map(category => ({
        ...category,
        menu_items: category.menu_items || [] // Ensure menu_items is an array
      })) || null;
    },
    enabled: !!restaurantId,
  });

  const { data: galleryImages, isLoading: isLoadingGallery, error: errorGallery } = useQuery<GalleryImage[] | null, Error>({
    queryKey: ['restaurantGallery', restaurantId],
    queryFn: () => fetchRestaurantGallery(restaurantId!),
    enabled: !!restaurantId,
  });

  if (isLoadingRestaurant || isLoadingMenu || isLoadingGallery) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (errorRestaurant || errorMenu || errorGallery) {
    showError('Erro ao carregar o perfil do restaurante.');
    return (
      <div className="text-center text-red-500 py-8">
        <p>Não foi possível carregar o perfil do restaurante. Por favor, tente novamente mais tarde.</p>
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

  const layoutProps = {
    restaurant,
    menuCategories: menuCategories || [],
    galleryImages: galleryImages || [],
  };

  return (
    <>
      {restaurant.plan === 'premium' ? (
        <PremiumProfileLayout {...layoutProps} />
      ) : (
        <FreeProfileLayout {...layoutProps} />
      )}
    </>
  );
};

export default RestaurantProfilePublic;