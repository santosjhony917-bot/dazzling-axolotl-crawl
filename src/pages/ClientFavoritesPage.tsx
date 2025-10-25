import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Loader2, Utensils, MapPin, ArrowLeft } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import ClientLayout from '@/components/ClientLayout';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface FavoriteRestaurant extends Restaurant {
  favorite_id: string;
}

// Definindo o tipo de dado retornado pelo Supabase para facilitar o mapeamento
type SupabaseFavorite = {
  id: string;
  restaurant: Restaurant | null;
};

export default function ClientFavoritesPage() {
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthLoading && user) {
      fetchFavorites();
    } else if (!isAuthLoading && !user) {
      setIsLoading(false);
    }
  }, [user, isAuthLoading]);

  const fetchFavorites = async () => {
    setIsLoading(true);
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .select(`
        id,
        restaurant:restaurant_id (
          id, user_id, name, description, image_url, cover_image_url, plan, phone, email, cnpj, category, whatsapp_url, ifood_url, other_url, address, number, neighborhood, city, state, cep, latitude, longitude, opening_hours, created_at, external_url
        )
      `)
      .eq('user_id', user.id)
      .returns<SupabaseFavorite[]>();

    if (error) {
      console.error('Error fetching favorites:', error);
    } else if (data) {
      const mappedFavorites: FavoriteRestaurant[] = data
        .map(item => {
          if (item.restaurant) {
            return {
              ...item.restaurant,
              favorite_id: item.id,
            } as FavoriteRestaurant;
          }
          return null;
        })
        .filter((r): r is FavoriteRestaurant => r !== null);

      setFavorites(mappedFavorites);
    }
    setIsLoading(false);
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    // Implementar lógica de remoção se necessário, mas por enquanto, apenas recarrega
    // Para simplificar, vamos apenas recarregar a lista
    await supabase.from('user_favorites').delete().eq('id', favoriteId);
    fetchFavorites();
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <ClientLayout title="Meus Favoritos" selectedTab="favorites" showBackButton={false}>
        <div className="p-6 text-center">
          <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 mb-6">Faça login para salvar e ver seus restaurantes favoritos.</p>
          <Button onClick={() => navigate(createPageUrl('login'))}>
            Fazer Login
          </Button>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout title="Meus Favoritos" selectedTab="favorites" showBackButton={false}>
      <div className="p-4 space-y-4">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Heart className="w-7 h-7 fill-primary" /> Favoritos
        </h1>

        {favorites.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-lg shadow-sm mt-6">
            <Heart className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-600">Você ainda não tem favoritos.</p>
            <p className="text-sm text-gray-500 mt-1">Comece a buscar e salve seus restaurantes preferidos!</p>
            <Button onClick={() => navigate(createPageUrl('search-restaurants'))} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2 rotate-180" /> Buscar Restaurantes
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((restaurant) => (
              <Card 
                key={restaurant.id} 
                className="flex overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
              >
                <img 
                  src={restaurant.image_url || PLACEHOLDER_IMAGE_URL} 
                  alt={restaurant.name} 
                  className="w-24 h-24 object-cover flex-shrink-0"
                />
                <div className="p-3 flex-1">
                  <CardTitle className="text-base font-bold truncate">{restaurant.name}</CardTitle>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Utensils className="w-3 h-3" /> {restaurant.category}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {restaurant.city}
                  </p>
                </div>
                <div className="p-3 flex items-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => {
                      e.stopPropagation(); // Previne a navegação ao clicar no botão
                      handleRemoveFavorite(restaurant.favorite_id);
                    }}
                    className="text-red-500 hover:bg-red-50"
                  >
                    <Heart className="w-5 h-5 fill-red-500" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}