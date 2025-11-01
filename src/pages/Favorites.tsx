"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { Restaurant, FavoriteRestaurant } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, HeartCrack } from 'lucide-react';
import RestaurantCard from '@/components/RestaurantCard';
import { createPageUrl } from '@/utils/navigation';
import { Button } from '@/components/ui/button'; // Importando Button
import { useQuery } from '@tanstack/react-query'; // Importando useQuery
import { supabase } from '@/integrations/supabase/client'; // Importando supabase

export default function Favorites() {
  const { user, isAuthenticated, isProfileLoading } = useAuthData();
  const navigate = useNavigate();
  const { favorites, isLoading: isLoadingFavorites } = useFavorites();

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-[#022D68] mb-4">Meus Favoritos</h1>
        <p className="text-gray-600">Você precisa estar logado para ver seus restaurantes favoritos.</p>
        <Button onClick={() => navigate('/auth')} className="mt-4 bg-[#E47948] hover:bg-[#C2653B]">
          Fazer Login
        </Button>
      </div>
    );
  }

  if (isLoadingFavorites) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-[#022D68] mb-4">Meus Favoritos</h1>
        <HeartCrack className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Você ainda não tem nenhum restaurante favorito.</p>
        <p className="text-gray-600">Explore e adicione seus restaurantes preferidos!</p>
        <Button onClick={() => navigate('/')} className="mt-4 bg-[#022D68] hover:bg-[#011F4A]">
          Explorar Restaurantes
        </Button>
      </div>
    );
  }

  // Assuming we need to fetch full restaurant details for each favorite
  // This is a simplified approach. In a real app, you might fetch these in a single query or pre-load.
  const { data: favoriteRestaurants, isLoading: isLoadingFullRestaurants } = useQuery<Restaurant[], Error>({
    queryKey: ['fullFavoriteRestaurants', favorites.map(f => f.restaurant_id)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .in('id', favorites.map(f => f.restaurant_id));
      if (error) throw error;
      return data || [];
    },
    enabled: favorites.length > 0,
  });

  if (isLoadingFullRestaurants) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-[#022D68] mb-6">Meus Restaurantes Favoritos</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {favoriteRestaurants?.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={{ ...restaurant, distance_km: undefined }} // RestaurantCard expects RestaurantWithDistance, so add distance_km as optional
            onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
          />
        ))}
      </div>
    </div>
  );
};