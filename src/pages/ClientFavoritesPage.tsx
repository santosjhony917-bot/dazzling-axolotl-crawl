import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Utensils, Loader2, ArrowLeft } from 'lucide-react';
import ClientLayout from '@/components/ClientLayout';
import { Button } from '@/components/ui/button';
import { useUserFavoritesList } from '@/hooks/useUserFavoritesList';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { createPageUrl } from '@/utils/url';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/context/AuthContext';

const ClientFavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuthContext();
  const { favorites, isLoading, error, refetch } = useUserFavoritesList();

  const handleViewRestaurant = (restaurantId: string) => {
    navigate(createPageUrl('restaurantProfile', { restaurantId }));
  };

  if (!session) {
    return (
      <ClientLayout selectedTab="favorites">
        <div className="p-6 text-center pt-20">
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-primary mb-2">Acesse sua conta</h1>
          <p className="text-gray-600 mb-6">Faça login para salvar seus restaurantes favoritos.</p>
          <Button onClick={() => navigate(createPageUrl('auth'))} className="bg-highlight hover:bg-highlight/90">
            Fazer Login
          </Button>
        </div>
      </ClientLayout>
    );
  }

  if (isLoading) {
    return (
      <ClientLayout selectedTab="favorites">
        <div className="p-4 pt-20 space-y-4">
          <h1 className="text-2xl font-bold text-primary">Meus Favoritos</h1>
          <Skeleton className="w-full h-48 rounded-xl" />
          <Skeleton className="w-full h-48 rounded-xl" />
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout selectedTab="favorites">
        <div className="p-6 text-center pt-20">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Erro ao carregar</h1>
          <p className="text-gray-600 mb-6">Não foi possível carregar seus favoritos. {error}</p>
          <Button onClick={() => refetch()} className="bg-highlight hover:bg-highlight/90">
            Tentar Novamente
          </Button>
        </div>
      </ClientLayout>
    );
  }

  if (favorites.length === 0) {
    return (
      <ClientLayout selectedTab="favorites">
        <div className="p-6 text-center pt-20">
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-primary mb-2">Nenhum Favorito</h1>
          <p className="text-gray-600 mb-6">Comece a explorar e adicione seus restaurantes preferidos!</p>
          <Button onClick={() => navigate(createPageUrl('home'))} className="bg-highlight hover:bg-highlight/90">
            Explorar Restaurantes
          </Button>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout selectedTab="favorites">
      <div className="p-4 space-y-4 pt-20">
        <h1 className="text-2xl font-bold text-primary">Meus Favoritos</h1>
        {favorites.map((fav) => (
          <RestaurantCard 
            key={fav.restaurant_id} 
            restaurant={fav.restaurants as any} 
            onClick={() => handleViewRestaurant(fav.restaurant_id)}
          />
        ))}
      </div>
    </ClientLayout>
  );
};

export default ClientFavoritesPage;