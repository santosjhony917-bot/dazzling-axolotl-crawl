"use client";

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData } from '@/types/restaurant';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const fetchRestaurantProfile = async (restaurantId: string): Promise<PublicRestaurantData> => {
  // 1. Fetch base restaurant data and aggregated data
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      is_favorite:user_favorites(count),
      followers_count:user_favorites(count),
      menu_categories (
        *,
        menu_items (*)
      ),
      gallery_images:restaurant_gallery (*)
    `)
    .eq('id', restaurantId)
    .single();

  if (error) {
    console.error('Error fetching restaurant profile:', error);
    throw new Error('Restaurante não encontrado.');
  }

  // 2. Process aggregated counts and computed fields
  const processedData: PublicRestaurantData = {
    ...data,
    // Supabase returns count as an array of objects: [{ count: N }]
    is_favorite: (data.is_favorite as unknown as { count: number }[])[0]?.count > 0,
    followers_count: (data.followers_count as unknown as { count: number }[])[0]?.count || 0,
    
    // Compute address summary for display/maps
    addressSummary: [data.address, data.number, data.neighborhood, data.city, data.state]
      .filter(Boolean)
      .join(', '),

    // Ensure relations are correctly typed (already handled by the select query structure)
    menu_categories: data.menu_categories as PublicRestaurantData['menu_categories'],
    gallery_images: data.gallery_images as PublicRestaurantData['gallery_images'],
  };

  return processedData;
};

const RestaurantProfilePage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();

  const { data: restaurant, isLoading, error } = useQuery<PublicRestaurantData, Error>({
    queryKey: ['publicRestaurantProfile', restaurantId],
    queryFn: () => fetchRestaurantProfile(restaurantId!),
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold">Restaurante não encontrado</h1>
        <p className="text-gray-500">Verifique o link e tente novamente.</p>
      </div>
    );
  }

  // Renderiza o layout apropriado baseado no plano
  if (restaurant.plan === 'premium') {
    return <PremiumProfileLayout restaurant={restaurant} />;
  }

  return <FreeProfileLayout restaurant={restaurant} />;
};

export default RestaurantProfilePage;