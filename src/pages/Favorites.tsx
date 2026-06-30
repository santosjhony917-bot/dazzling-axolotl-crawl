import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Loader2, Heart, MapPin, Utensils, ArrowLeft } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';
import { showError, showSuccess } from '@/utils/toast';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import Header from '@/components/Header';
import PhoneShell from '@/components/layout/PhoneShell';

type FavoriteRestaurantData = {
  restaurant: Restaurant;
};

const fetchFavorites = async (userId: string): Promise<FavoriteRestaurantData[]> => {
  if (userId.startsWith('mock-')) {
    return [];
  }

  const { data, error } = await supabase
    .from('user_favorites')
    .select('restaurant:restaurants(*)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching favorites:', error);
    throw new Error('Não foi possível carregar seus favoritos.');
  }

  if (!data) return [];

  return (data as unknown as FavoriteRestaurantData[]).filter(item => item && item.restaurant);
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
    mutationFn: ({ restaurantId, userId }: { restaurantId: string; userId: string }) =>
      removeFavorite(restaurantId, userId),
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
      <PhoneShell>
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
          <Loader2 className="h-7 w-7 animate-spin text-highlight" />
        </div>
      </PhoneShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <PhoneShell>
        <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
          <Header title="Meus Favoritos" leftAction={{ icon: ArrowLeft, onClick: handleBack }} />
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-highlight shadow-soft">
              <Heart className="h-5 w-5" />
            </div>
            <h2 className="mb-2 text-[22px] font-semibold tracking-tight text-[#3C2F2F]">
              Entre para ver favoritos
            </h2>
            <p className="mb-6 max-w-[280px] text-sm leading-relaxed text-text-secondary">
              Faça login para guardar restaurantes e voltar neles com calma.
            </p>
            <Button className="h-11 px-6 shadow-none" onClick={() => navigate(createPageUrl('auth'))}>
              Fazer login
            </Button>
          </div>
        </div>
      </PhoneShell>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <PhoneShell>
        <div className="flex min-h-screen w-full flex-col bg-[#FAFAFA] font-['Poppins']">
          <Header title="Meus Favoritos" leftAction={{ icon: ArrowLeft, onClick: handleBack }} />
          <div className="flex flex-1 flex-col items-center justify-center px-8 pb-20 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-highlight shadow-soft">
              <Heart className="h-5 w-5" />
            </div>
            <h2 className="mb-2 text-[22px] font-semibold tracking-tight text-[#3C2F2F]">
              Nenhum favorito ainda
            </h2>
            <p className="max-w-[280px] text-sm font-normal leading-relaxed text-text-secondary">
              Salve os restaurantes que você quer visitar de novo ou comparar depois.
            </p>
          </div>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <div className="flex min-h-screen w-full flex-col bg-[#FAFAFA] font-['Poppins']">
        <Header title="Meus Favoritos" leftAction={{ icon: ArrowLeft, onClick: handleBack }} />
        <div className="space-y-4 px-4 pb-24 pt-4">
          <h2 className="px-1 text-sm font-semibold text-[#3C2F2F]">
            Restaurantes salvos ({favorites.length})
          </h2>

          <div className="space-y-3">
            {favorites.map((item) => {
              const restaurant = item.restaurant;

              if (!restaurant) return null;

              return (
                <div
                  key={restaurant.id}
                  className="relative flex h-[92px] cursor-pointer overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-soft transition-transform hover:translate-y-[-1px]"
                >
                  <div
                    className="flex flex-1"
                    onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
                  >
                    <img
                      src={restaurant.image_url || PLACEHOLDER_IMAGE_URL}
                      alt={restaurant.name}
                      className="h-full w-[30%] flex-shrink-0 bg-slate-50 object-contain"
                    />
                    <div className="flex min-w-0 flex-1 flex-col justify-center p-3">
                      <h3 className="truncate pr-7 text-[15px] font-semibold text-[#3C2F2F]">
                        {restaurant.name}
                      </h3>

                      {restaurant.category && (
                        <p className="mt-1 flex items-center gap-1 text-xs font-normal text-text-secondary">
                          <Utensils className="h-3.5 w-3.5 text-highlight" /> {restaurant.category}
                        </p>
                      )}

                      {restaurant.city && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-normal text-text-secondary">
                          <MapPin className="h-3.5 w-3.5 text-highlight/80" /> {restaurant.city}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-highlight transition-colors hover:bg-highlight/10"
                    disabled={removeFavoriteMutation.isPending}
                    aria-label="Remover favorito"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (user) {
                        removeFavoriteMutation.mutate({ restaurantId: restaurant.id, userId: user.id });
                      }
                    }}
                  >
                    {removeFavoriteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin text-highlight" />
                    ) : (
                      <Heart className="h-[18px] w-[18px] fill-highlight text-highlight" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
