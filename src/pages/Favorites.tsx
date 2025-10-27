import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, FavoriteRestaurant } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Heart, MapPin, Utensils, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createPageUrl } from '@/utils/url';
import { showError, showSuccess } from '@/utils/toast';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

// Definindo o tipo de dado que esperamos do join (user_favorites -> restaurants)
type FavoriteRestaurantData = {
  restaurant: Restaurant;
};

const fetchFavorites = async (userId: string): Promise<FavoriteRestaurantData[]> => {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('restaurant:restaurants(*)') // Seleciona todos os campos do restaurante relacionado
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching favorites:', error);
    throw new Error('Não foi possível carregar seus favoritos.');
  }

  // O Supabase retorna um array de objetos com a chave 'restaurant' contendo o objeto Restaurant.
  // O cast é necessário porque o Supabase tipa o resultado do select com alias de forma genérica.
  return (data as FavoriteRestaurantData[]).filter(item => item.restaurant);
};

const removeFavorite = async (restaurantId: string, userId: string) => {
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId);

  if (error) {
    throw new Error('Erro ao remover favorito.');
  }
};

export default function Favorites() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: favorites, isLoading: isFavoritesLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => fetchFavorites(user!.id),
    enabled: isAuthenticated && !!user,
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: ({ restaurantId, userId }: { restaurantId: string, userId: string }) => removeFavorite(restaurantId, userId),
    onSuccess: () => {
      showSuccess('Restaurante removido dos favoritos.');
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  if (isAuthLoading || isFavoritesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Acesso Negado</h2>
        <p className="text-gray-600 mb-6">Faça login para ver seus restaurantes favoritos.</p>
        <Button onClick={() => navigate(createPageUrl('auth'))}>
          Fazer Login
        </Button>
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="p-6 text-center">
        <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Nenhum Favorito Encontrado</h2>
        <p className="text-gray-600">Parece que você ainda não adicionou nenhum restaurante aos seus favoritos.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-primary">Meus Favoritos ({favorites.length})</h1>
      
      <div className="space-y-4">
        {favorites.map(({ restaurant }) => (
          <Card 
            key={restaurant.id} 
            className="flex overflow-hidden cursor-pointer hover:shadow-soft-lg transition-shadow relative border-none shadow-soft-md rounded-xl"
          >
            <div 
              className="flex flex-1"
              onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
            >
              <img 
                src={restaurant.image_url || PLACEHOLDER_IMAGE_URL} 
                alt={restaurant.name}
                className="w-24 h-24 object-cover flex-shrink-0"
              />
              <div className="p-3 flex-1 min-w-0">
                <CardTitle className="text-lg font-bold truncate text-primary">{restaurant.name}</CardTitle>
                
                {restaurant.category && (
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <Utensils className="w-4 h-4 text-highlight" /> {restaurant.category}
                  </p>
                )}

                {restaurant.city && (
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4 text-highlight" /> {restaurant.city}
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-red-500 hover:bg-red-50"
              disabled={removeFavoriteMutation.isPending}
              onClick={(e) => {
                e.stopPropagation(); // Previne o clique no card
                if (user) {
                  removeFavoriteMutation.mutate({ restaurantId: restaurant.id, userId: user.id });
                }
              }}
            >
              {removeFavoriteMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}