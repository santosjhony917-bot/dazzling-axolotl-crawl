import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Utensils, MapPin, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppHeader from '@/components/AppHeader';
import { useAuthContext } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';
import { showError, showSuccess } from '@/utils/toast';
import { Button } from '@/components/ui/button';

// O tipo FavoriteRestaurant é essencialmente o Restaurant que vem da tabela user_favorites
interface FavoriteRestaurant extends Restaurant {}

const PLACEHOLDER_IMAGE_URL = 'https://via.placeholder.com/150?text=Restaurante';

const fetchFavorites = async (userId: string): Promise<FavoriteRestaurant[]> => {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('restaurant:restaurants(*)')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  // Mapeia para retornar apenas o objeto Restaurant
  return data.map(fav => fav.restaurant) as FavoriteRestaurant[];
};

const useRemoveFavorite = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (restaurantId: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId);

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Restaurante removido dos favoritos.");
      queryClient.invalidateQueries({ queryKey: ['userFavorites', user?.id] });
    },
    onError: (e) => {
      showError(`Falha ao remover favorito: ${(e as Error).message}`);
    }
  });
};

export default function ClientFavoritesPage() {
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const navigate = useNavigate();
  
  const { data: favorites, isLoading: isFavoritesLoading, error } = useQuery({
    queryKey: ['userFavorites', user?.id],
    queryFn: () => fetchFavorites(user!.id),
    enabled: !!user?.id,
  });
  
  const removeFavoriteMutation = useRemoveFavorite();

  const isLoading = isAuthLoading || isFavoritesLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertTriangle className="w-6 h-6 mx-auto text-red-500 mb-2" />
        <p className="text-red-600">Erro ao carregar favoritos.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <AppHeader title="Meus Favoritos" backPath="/home" />

      <main className="p-4 space-y-4">
        <Card className="shadow-sm border-none">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-primary">
              <Heart className="w-5 h-5 fill-primary" /> Restaurantes Favoritos ({favorites?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {favorites && favorites.length > 0 ? (
              favorites.map((restaurant) => (
                <Card 
                  key={restaurant.id} 
                  className="flex overflow-hidden cursor-pointer hover:shadow-lg transition-shadow relative"
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
                      <CardTitle className="text-base font-bold truncate">{restaurant.name}</CardTitle>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Utensils className="w-3 h-3" /> {restaurant.category}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {restaurant.city}
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 text-red-500 hover:bg-red-50"
                    onClick={() => removeFavoriteMutation.mutate(restaurant.id)}
                    disabled={removeFavoriteMutation.isPending}
                  >
                    {removeFavoriteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-5 w-5 fill-red-500" />}
                  </Button>
                </Card>
              ))
            ) : (
              <p className="text-center text-gray-500">Você ainda não adicionou nenhum restaurante aos favoritos.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}