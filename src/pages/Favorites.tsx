import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, FavoriteRestaurant } from '@/types/supabase'; // CORREÇÃO: FavoriteRestaurant agora é exportado
import { Button } from '@/components/ui/button';
import { Loader2, Heart, MapPin, Utensils, ArrowLeft } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';
import { showError, showSuccess } from '@/utils/toast';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import Header from '@/components/Header'; // Importando o componente Header

// Definindo o tipo de dado que esperamos do join (user_favorites -> restaurants)
type FavoriteRestaurantData = {
  restaurant: Restaurant;
};

const fetchFavorites = async (userId: string): Promise<FavoriteRestaurantData[]> => {
  if (userId.startsWith('mock-')) {
    return [];
  }

  const { data, error } = await supabase
    .from('user_favorites')
    .select('restaurant:restaurants(*)') // Seleciona todos os campos do restaurante relacionado
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching favorites:', error);
    throw new Error('Não foi possível carregar seus favoritos.');
  }

  if (!data) return [];

  // O Supabase retorna um array de objetos com a chave 'restaurant' contendo o objeto Restaurant.
  // Filtramos para garantir que o objeto 'restaurant' exista e fazemos o cast.
  return (data as unknown as FavoriteRestaurantData[])
    .filter(item => item && item.restaurant) as FavoriteRestaurantData[];
};

const removeFavorite = async (restaurantId: string, userId: string) => {
  if (userId.startsWith('mock-')) {
    return;
  }

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
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: favorites, isLoading: isFavoritesLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => fetchFavorites(user?.id || ''),
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

  const handleBack = () => navigate(-1);

  if (isAuthLoading || isFavoritesLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
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
      <div className="flex flex-col w-full flex-grow bg-white font-['Poppins']">
        <Header 
          title="Meus Favoritos"
          leftAction={{ icon: ArrowLeft, onClick: handleBack }}
        />
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center mt-12 bg-transparent">
          <Heart className="w-12 h-12 text-slate-300 mb-3" />
          <h2 className="text-lg font-extrabold text-slate-800 mb-2">Nenhum Favorito Encontrado</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[250px]">
            Parece que você ainda não adicionou nenhum restaurante aos seus favoritos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full flex-grow bg-white font-['Poppins']">
      <Header 
        title="Meus Favoritos"
        leftAction={{ icon: ArrowLeft, onClick: handleBack }}
      />
      <div className="p-4 space-y-4">
        <h2 className="text-sm font-extrabold text-slate-800 px-1">Restaurantes Salvos ({favorites.length})</h2>
        
        <div className="space-y-4">
          {favorites.map((item, index) => {
            const restaurant = item.restaurant;
            
            if (!restaurant) return null; 
            
            return (
              <div 
                key={restaurant.id} 
                className="soft-card flex overflow-hidden cursor-pointer hover:scale-[1.01] transition-transform relative h-24 bg-white"
              >
                <div 
                  className="flex flex-1"
                  onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
                >
                  <img 
                    src={restaurant.image_url || PLACEHOLDER_IMAGE_URL} 
                    alt={restaurant.name}
                    className="w-[28%] h-full object-cover flex-shrink-0"
                  />
                  <div className="p-3 flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-base font-extrabold text-[#3C2F2F] truncate pr-6">{restaurant.name}</h3>
                    
                    {restaurant.category && (
                      <p className="text-xs font-semibold text-[#6A6A6A] mt-1 flex items-center gap-1">
                        <Utensils className="w-3.5 h-3.5 text-[#EF2A39]/70" /> {restaurant.category}
                      </p>
                    )}

                    {restaurant.city && (
                      <p className="text-xs font-semibold text-[#6A6A6A] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#EF2A39]/55" /> {restaurant.city}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1.5 right-1.5 text-[#EF2A39] hover:bg-[#EF2A39]/10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  disabled={removeFavoriteMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation(); 
                    if (user) {
                      removeFavoriteMutation.mutate({ restaurantId: restaurant.id, userId: user.id });
                    }
                  }}
                >
                  {removeFavoriteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#EF2A39]" />
                  ) : (
                    <Heart className="w-4.5 h-4.5 fill-[#EF2A39] text-[#EF2A39]" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}