import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicRestaurant } from '@/hooks/usePublicRestaurant';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { Loader2 } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext';
import { base44 } from '@/api/base44Client';
import { showError } from '@/utils/toast';
import { PublicRestaurantData } from '@/types/restaurant'; // Importar PublicRestaurantData

export default function RestaurantProfilePublic() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { restaurant, isLoading, error, refetchRestaurant } = usePublicRestaurant(restaurantId);
  const { user } = useAuthData();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (restaurant && user) {
      // Verifica se o restaurante já está nos favoritos do usuário
      const checkFavoriteStatus = async () => {
        try {
          const { data, error } = await base44.from('user_favorites')
            .select('*')
            .eq('user_id', user.id)
            .eq('restaurant_id', restaurant.id)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
            throw error;
          }
          setIsFavorite(!!data);
        } catch (err) {
          console.error('Error checking favorite status:', err);
          showError('Erro ao verificar status de favorito.');
        }
      };
      checkFavoriteStatus();
    }
  }, [restaurant, user]);

  const handleFavoriteToggle = async (newFavoriteStatus: boolean) => {
    if (!user) {
      showError('Você precisa estar logado para favoritar restaurantes.');
      return;
    }
    if (!restaurant) return;

    try {
      if (newFavoriteStatus) {
        await base44.from('user_favorites').insert({ user_id: user.id, restaurant_id: restaurant.id });
        showSuccess('Restaurante adicionado aos favoritos!');
      } else {
        await base44.from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('restaurant_id', restaurant.id);
        showSuccess('Restaurante removido dos favoritos.');
      }
      setIsFavorite(newFavoriteStatus);
      refetchRestaurant(); // Para atualizar a contagem de seguidores, se aplicável
    } catch (err) {
      console.error('Error toggling favorite status:', err);
      showError('Erro ao atualizar favoritos. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-highlight" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        <p className="text-xl font-semibold">Erro ao carregar perfil do restaurante.</p>
        <p className="mt-2">{error.message}</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center p-8 text-gray-600">
        <p className="text-xl font-semibold">Restaurante não encontrado.</p>
        <p className="mt-2">Verifique o link e tente novamente.</p>
      </div>
    );
  }

  // Cria uma cópia do objeto restaurant e adiciona is_favorite
  const restaurantWithFavoriteStatus: PublicRestaurantData = {
    ...restaurant,
    is_favorite: isFavorite, // Sobrescreve o valor estático com o valor reativo do hook
  };

  return (
    <>
      {restaurant.plan === 'premium' || restaurant.plan === 'premium_gift' ? (
        <PremiumProfileLayout
          restaurant={restaurantWithFavoriteStatus}
          onFavoriteToggle={handleFavoriteToggle}
          isFavorite={isFavorite}
        />
      ) : (
        <FreeProfileLayout
          restaurant={restaurantWithFavoriteStatus}
          onFavoriteToggle={handleFavoriteToggle}
          isFavorite={isFavorite}
        />
      )}
    </>
  );
}