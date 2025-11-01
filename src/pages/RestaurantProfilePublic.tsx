"use client";

import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData, Restaurant } from '@/types/restaurant';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { getRestaurantOpenStatus } from '@/lib/schedule';
import { WeekSchedule } from '@/types/schedule';

// Helper function to process raw restaurant data into PublicRestaurantData
const processRestaurantData = (
  rawRestaurant: Restaurant,
  isFavorite: boolean,
  followersCount: number
): PublicRestaurantData => {
  const addressParts = [];
  if (rawRestaurant.address) addressParts.push(`${rawRestaurant.address}, ${rawRestaurant.number}`);
  if (rawRestaurant.neighborhood) addressParts.push(rawRestaurant.neighborhood);
  if (rawRestaurant.city && rawRestaurant.state) addressParts.push(`${rawRestaurant.city}, ${rawRestaurant.state}`);

  const openStatus = getRestaurantOpenStatus(rawRestaurant.opening_hours as WeekSchedule | null);

  return {
    ...rawRestaurant,
    is_favorite: isFavorite,
    followers_count: followersCount,
    addressSummary: addressParts.join(' - '),
    logoUrl: rawRestaurant.image_url || '',
    coverImageUrl: rawRestaurant.cover_image_url || '',
    whatsappUrl: rawRestaurant.whatsapp_url || '',
    ifoodUrl: rawRestaurant.ifood_url || '',
    otherUrl: rawRestaurant.other_url || '',
    opening_hours: rawRestaurant.opening_hours as WeekSchedule | null,
    isOpen: openStatus.isOpen,
    statusText: openStatus.statusText,
    nextOpenTime: openStatus.nextOpenTime,
    menu_categories: [],
    gallery_images: [],
    payment_methods: rawRestaurant.payment_methods as string[] | null,
    social_networks: rawRestaurant.social_networks as unknown as PublicRestaurantData['social_networks'],
  };
};

const fetchRestaurantData = async (slug: string, userId: string | null): Promise<PublicRestaurantData> => {
  // 1. Fetch Restaurant details
  const { data: restaurantData, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('external_url', slug)
    .single();

  if (restaurantError || !restaurantData) {
    throw new Error('Restaurante não encontrado.');
  }

  const restaurantId = restaurantData.id;

  // 2. Fetch Followers Count (using RPC)
  const { data: followersData, error: followersError } = await supabase.rpc('count_restaurant_followers', {
    p_restaurant_id: restaurantId,
  });

  const followersCount = followersData ?? 0;

  // 3. Check if current user favorited this restaurant
  let isFavorite = false;
  if (userId) {
    const { data: favoriteData, error: favoriteError } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (favoriteError) console.error('Error fetching favorite status:', favoriteError);
    isFavorite = !!favoriteData;
  }

  return processRestaurantData(restaurantData, isFavorite, followersCount);
};

const toggleFavoriteStatus = async (restaurantId: string, isFavorite: boolean, userId: string) => {
  if (isFavorite) {
    // Remove favorite
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);
    if (error) throw error;
  } else {
    // Add favorite
    const { error } = await supabase
      .from('user_favorites')
      .insert({ user_id: userId, restaurant_id: restaurantId });
    if (error) throw error;
  }
};

export default function RestaurantProfilePublic() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: restaurant, isLoading, error } = useQuery<PublicRestaurantData>({
    queryKey: ['restaurantProfile', slug, user?.id],
    queryFn: () => fetchRestaurantData(slug!, user?.id || null),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const favoriteMutation = useMutation({
    mutationFn: (isFavorite: boolean) =>
      toggleFavoriteStatus(restaurant!.id, isFavorite, user!.id),
    onSuccess: (_, isFavorite) => {
      queryClient.invalidateQueries({ queryKey: ['restaurantProfile', slug, user?.id] });
      toast.success(isFavorite ? 'Removido dos favoritos.' : 'Adicionado aos favoritos!');
    },
    onError: (err) => {
      console.error('Favorite mutation failed:', err);
      toast.error('Falha ao atualizar favoritos. Tente novamente.');
    },
  });

  const handleToggleFavorite = () => {
    if (!user) {
      toast.error('Você precisa estar logado para favoritar um restaurante.');
      // Optionally redirect to login
      return;
    }
    if (restaurant) {
      favoriteMutation.mutate(restaurant.is_favorite);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Skeleton className="h-64 w-full" />
        <div className="container mx-auto px-4 -mt-16 pb-8">
          <Skeleton className="h-32 w-full rounded-xl shadow-lg mb-6" />
          <Skeleton className="h-40 w-full rounded-lg mb-6" />
          <Skeleton className="h-60 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Erro 404</h1>
          <p className="text-gray-600">Restaurante não encontrado ou URL inválida.</p>
        </div>
      </div>
    );
  }

  const layoutProps = {
    restaurant,
    toggleFavorite: handleToggleFavorite,
    isFavoriteMutating: favoriteMutation.isPending,
  };

  return (
    <>
      {restaurant.plan === 'premium' || restaurant.plan === 'premium_gift' ? (
        <PremiumProfileLayout {...layoutProps} />
      ) : (
        <FreeProfileLayout {...layoutProps} />
      )}
    </>
  );
}