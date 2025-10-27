import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Utensils, MapPin, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppHeader from '@/components/Header';
import { useAuthContext } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';
import { showError, showSuccess } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import ClientPageWrapper from '@/components/ClientPageWrapper'; // Importação atualizada

// O tipo FavoriteRestaurant é essencialmente o Restaurant que vem da tabela user_favorites
interface FavoriteRestaurant extends Restaurant {}

// Tipo intermediário retornado pela query do Supabase
interface FavoriteQueryRow {
  restaurant_id: FavoriteRestaurant; // Nome da relação deve ser o nome da coluna FK
}

const PLACEHOLDER_IMAGE_URL = 'https://via.placeholder.com/150?text=Restaurante';

const fetchFavorites = async (userId: string): Promise<FavoriteRestaurant[]> => {
  // Tentativa 3: Usando a sintaxe de expansão na coluna FK: 'restaurant_id(*)'
  const { data: data2, error: error2 } = await supabase
    .from('user_favorites')
    .select(`
      restaurant_id ( * )
    `)
    .eq('user_id', userId);

  if (error2) {
    // Se o erro persistir, vamos inspecionar o erro para ver se há mais detalhes.
    throw error2;
  }

  // Mapeia para retornar apenas o objeto Restaurant, filtrando nulos
  // Corrigindo o erro de tipagem: forçamos o tipo do item mapeado para FavoriteRestaurant
  return (data2 as unknown as FavoriteQueryRow[])
    .map(fav => fav.restaurant_id as FavoriteRestaurant) // Explicit cast para resolver TS2322
    .filter((r): r is FavoriteRestaurant => !!r); // Agora o predicado de tipo é válido (TS2677 resolvido)
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
      queryClient.invalidateQueries({ queryKey: ['userFavoriteIds'] }); // Invalida a lista de IDs
    },
    onError: (e) => {
      showError(`Falha ao remover favorito: ${(e as Error).message}`);
    }
  });
};

export default function FavoritesPage() {
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
        <p className="text-red-600">Erro ao carregar favoritos: {error.message}</p>
      </div>
    );
  }

  return (
    <ClientPageWrapper>
      <AppHeader 
        title="Meus Favoritos" 
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(createPageUrl('home')) }}
      />

      <main className="p-4 space-y-4">
        <Card className="shadow-soft-xl border-none rounded-2xl bg-white">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2 text-primary">
              <Heart className="w-6 h-6 fill-highlight text-highlight" /> Restaurantes Favoritos ({favorites?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {favorites && favorites.length > 0 ? (
              favorites.map((restaurant) => (
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
                      <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                        <Utensils className="w-4 h-4 text-highlight" /> {restaurant.category}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4 text-highlight" /> {restaurant.city}
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 text-red-500 hover:bg-red-50 rounded-full"
                    onClick={(e) => {
                        e.stopPropagation(); // Previne o clique no card
                        removeFavoriteMutation.mutate(restaurant.id);
                    }}
                    disabled={removeFavoriteMutation.isPending}
                  >
                    {removeFavoriteMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5 fill-red-500" />}
                  </Button>
                </Card>
              ))
            ) : (
              <div className="text-center p-4">
                <Heart className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Você ainda não adicionou nenhum restaurante aos favoritos.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </ClientPageWrapper>
  );
}