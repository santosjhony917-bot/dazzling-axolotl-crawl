import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, FavoriteRestaurant } from '@/types/supabase'; // CORREÇÃO: FavoriteRestaurant agora é exportado
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, HeartCrack } from 'lucide-react';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { createPageUrl } from '@/utils/url';
import { useAuthData } from '@/context/AuthContext';
import Header from '@/components/Header';

const fetchFavoriteRestaurants = async (userId: string): Promise<FavoriteRestaurant[]> => {
  const { data, error } = await supabase
    .from('user_favorites')
    .select(`
      *,
      restaurant:restaurants (*)
    `)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
  return data as FavoriteRestaurant[];
};

const FavoritesPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthData();
  const navigate = useNavigate();

  const { data: favoriteRestaurants, isLoading, error } = useQuery<FavoriteRestaurant[], Error>({
    queryKey: ['favoriteRestaurants', user?.id],
    queryFn: () => fetchFavoriteRestaurants(user!.id),
    enabled: isAuthenticated && !!user?.id,
  });

  const handleRestaurantClick = (restaurantId: string) => {
    navigate(createPageUrl('restaurantProfile', { restaurantId }));
  };

  return (
    <div className="min-h-screen bg-background-light max-w-md mx-auto">
      <Header title="Meus Favoritos" />

      <div className="p-4 space-y-4">
        {!isAuthenticated ? (
          <div className="text-center p-8 bg-white rounded-xl shadow-soft-md">
            <HeartCrack className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-semibold">Faça login para ver seus favoritos</p>
            <p className="mt-2 text-gray-600">Sua lista de restaurantes favoritos estará aqui.</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-xl shadow-soft-md">
            <p className="font-semibold">Erro ao carregar favoritos:</p>
            <p>{error.message}</p>
          </div>
        ) : favoriteRestaurants && favoriteRestaurants.length > 0 ? (
          <div className="space-y-4">
            {favoriteRestaurants.map((fav) => (
              <RestaurantCard
                key={fav.restaurant.id}
                restaurant={fav.restaurant}
                onClick={() => handleRestaurantClick(fav.restaurant.id)}
                isFavorite={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-white rounded-xl shadow-soft-md">
            <HeartCrack className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-semibold">Nenhum favorito encontrado</p>
            <p className="mt-2 text-gray-600">Comece a explorar e adicione seus restaurantes preferidos!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;