import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface UseRestaurantFavoritesResult {
  followersCount: number;
  isFavorite: boolean;
  handleToggleFavorite: () => void;
  isLoading: boolean;
}

export const useRestaurantFavorites = (restaurantId: string): UseRestaurantFavoritesResult => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [followersCount, setFollowersCount] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFavoritesData = useCallback(async () => {
    if (!restaurantId) return;

    setIsLoading(true);

    // 1. Fetch total followers count
    const { count: totalCount, error: countError } = await supabase
      .from('user_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);

    if (countError) {
      console.error("Error fetching followers count:", countError);
      setFollowersCount(0);
    } else {
      setFollowersCount(totalCount || 0);
    }

    // 2. Check if current user has favorited this restaurant
    if (user) {
      const { data: favoriteData, error: favoriteError } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId)
        .single();

      if (favoriteError && favoriteError.code !== 'PGRST116') { // PGRST116 = No rows found
        console.error("Error checking favorite status:", favoriteError);
        setIsFavorite(false);
      } else {
        setIsFavorite(!!favoriteData);
      }
    } else {
      setIsFavorite(false);
    }

    setIsLoading(false);
  }, [restaurantId, user]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchFavoritesData();
    }
  }, [fetchFavoritesData, isAuthLoading]);

  const handleToggleFavorite = useCallback(async () => {
    if (!user) {
      toast.error("Você precisa estar logado para favoritar um restaurante.");
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    if (isFavorite) {
      // Remove favorite
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId);

      if (error) {
        toast.error("Erro ao remover dos favoritos.");
        console.error("Error removing favorite:", error);
      } else {
        setIsFavorite(false);
        setFollowersCount(prev => prev - 1);
        toast.success("Removido dos favoritos!");
      }
    } else {
      // Add favorite
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, restaurant_id: restaurantId });

      if (error) {
        toast.error("Erro ao adicionar aos favoritos.");
        console.error("Error adding favorite:", error);
      } else {
        setIsFavorite(true);
        setFollowersCount(prev => prev + 1);
        toast.success("Adicionado aos favoritos!");
      }
    }
    setIsLoading(false);
  }, [user, isFavorite, restaurantId, isLoading]);

  return {
    followersCount,
    isFavorite,
    handleToggleFavorite,
    isLoading,
  };
};