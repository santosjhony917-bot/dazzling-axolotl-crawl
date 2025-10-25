import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Utensils, MapPin, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { useUserFavoritesList } from '@/hooks/useUserFavoritesList';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

export default function Favorites() {
  const { user, isLoading: isAuthLoading, restaurant } = useAuthContext();
  const navigate = useNavigate();
  const isRestaurantUser = !!restaurant;
  
  // Se não estiver logado, não tenta carregar favoritos
  const { favorites, isLoading: isFavoritesLoading, error } = useUserFavoritesList();

  const isLoading = isAuthLoading || isFavoritesLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    // Se não estiver logado, mostra a tela de login/explorar
    return (
      <div className="p-6 text-center">
        <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Acesse para ver seus favoritos</h2>
        <p className="text-gray-600 mb-6">Faça login para salvar e gerenciar seus restaurantes preferidos.</p>
        <Button onClick={() => navigate(createPageUrl('auth'))}>
          Fazer Login
        </Button>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">Erro ao carregar favoritos: {error}</div>;
  }

  if (favorites.length === 0) {
    return (
      <div className="p-6 text-center">
        <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhum favorito encontrado</h2>
        <p className="text-gray-600 mb-6">Comece a explorar e adicione seus restaurantes preferidos.</p>
        <Button onClick={() => navigate(createPageUrl('home'))}>
          Explorar Restaurantes
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
        <Heart className="w-6 h-6 fill-red-500 text-red-500" /> Meus Favoritos
      </h1>
      
      <div className="space-y-4">
        {favorites.map((fav) => {
          const r = fav.restaurants;
          if (!r) return null;

          return (
            <Card 
              key={r.id} 
              className="flex p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: r.id }))}
            >
              <img 
                src={r.image_url || PLACEHOLDER_IMAGE_URL} 
                alt={r.name} 
                className="w-20 h-20 object-cover rounded-lg mr-4 shrink-0"
              />
              <div className="flex flex-col justify-center">
                <h3 className="font-bold text-lg text-gray-800">{r.name}</h3>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Utensils className="w-3 h-3" /> {r.category || 'Geral'}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {r.city || 'Localização desconhecida'}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
      
      {isRestaurantUser && (
        <p className="text-sm text-gray-500 mt-6 text-center">
          Usuários de restaurante não podem favoritar.
        </p>
      )}
    </div>
  );
}