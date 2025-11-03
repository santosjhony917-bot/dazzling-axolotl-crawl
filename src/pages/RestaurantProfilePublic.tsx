import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Utensils, ArrowLeft, AlertTriangle } from 'lucide-react';
import { RestaurantProfile } from '@/types/restaurant'; // Corrigido para RestaurantProfile
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { usePublicRestaurant } from '@/hooks/usePublicRestaurant';
import { useAuth } from '@/hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { calculateDistance } from '@/lib/utils';
import useUserLocation from '@/hooks/useUserLocation';

const RestaurantProfilePublic: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();
  const { userLocation } = useUserLocation();

  const { data: restaurant, isLoading, error, refetch } = usePublicRestaurant(id || '');

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user) {
        toast({
          title: "Faça login para favoritar",
          description: "Você precisa estar logado para adicionar restaurantes aos seus favoritos.",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }

      if (restaurant?.is_favorite) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('restaurant_id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: session.user.id, restaurant_id: id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Sucesso",
        description: restaurant?.is_favorite ? "Restaurante removido dos favoritos." : "Restaurante adicionado aos favoritos.",
      });
    },
    onError: (err) => {
      toast({
        title: "Erro",
        description: `Não foi possível atualizar favoritos: ${err.message}`,
        variant: "destructive",
      });
    },
  });

  const layoutProps = useMemo(() => {
    if (!restaurant) return null;

    const now = new Date();
    const today = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

    let isOpen = false;
    let statusText = 'Fechado';

    if (restaurant.opening_hours && typeof restaurant.opening_hours === 'object' && restaurant.opening_hours[today]) {
      const dayHours = restaurant.opening_hours[today];
      for (const period of dayHours) {
        const [openHour, openMinute] = period.open.split(':').map(Number);
        const [closeHour, closeMinute] = period.close.split(':').map(Number);

        const openTime = openHour * 60 + openMinute;
        const closeTime = closeHour * 60 + closeMinute;

        if (currentTime >= openTime && currentTime <= closeTime) {
          isOpen = true;
          statusText = 'Aberto agora';
          break;
        }
      }
    } else {
      statusText = 'Horário não definido';
    }

    let distance = null;
    if (userLocation && restaurant.latitude && restaurant.longitude) {
      distance = calculateDistance(userLocation.latitude, userLocation.longitude, restaurant.latitude, restaurant.longitude);
    }

    const is_favorite = restaurant.user_favorites.some(fav => fav.user_id === session?.user?.id);

    const addressParts = [];
    if (restaurant.address) addressParts.push(restaurant.address);
    if (restaurant.number) addressParts.push(restaurant.number);
    if (restaurant.neighborhood) addressParts.push(restaurant.neighborhood);
    if (restaurant.city) addressParts.push(restaurant.city);
    if (restaurant.state) addressParts.push(restaurant.state);
    const fullAddress = addressParts.join(', ');

    const addressSummaryParts = [];
    if (restaurant.city) addressSummaryParts.push(restaurant.city);
    if (restaurant.state) addressSummaryParts.push(restaurant.state);
    const addressSummary = addressSummaryParts.join(', ');

    return {
      ...restaurant,
      isOpen,
      statusText,
      distance,
      is_favorite,
      fullAddress,
      addressSummary,
      menu_categories: restaurant.menu_categories?.sort((a, b) => a.order_index - b.order_index) || [],
    };
  }, [restaurant, userLocation, session]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-500">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <p className="mt-2 text-lg">Erro ao carregar o restaurante.</p>
        <p className="text-sm text-gray-600">{error.message}</p>
        <button onClick={() => navigate('/')} className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a página inicial
        </button>
      </div>
    );
  }

  if (!restaurant || !layoutProps) {
    return (
      <div className="text-center p-4 text-gray-500">
        <Utensils className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-lg">Restaurante não encontrado.</p>
        <button onClick={() => navigate('/')} className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a página inicial
        </button>
      </div>
    );
  }

  const planToRender = restaurant.plan; // Ou determine a partir de layoutProps se necessário

  return (
    <div className="min-h-screen bg-gray-100">
      {planToRender === 'premium' || planToRender === 'premium_gift' ? (
        <PremiumProfileLayout
          restaurant={layoutProps as RestaurantProfile} // Cast para RestaurantProfile
          toggleFavorite={toggleFavoriteMutation.mutate}
          isFavoriteMutating={toggleFavoriteMutation.isPending}
        />
      ) : (
        <FreeProfileLayout
          restaurant={layoutProps as RestaurantProfile} // Cast para RestaurantProfile
          toggleFavorite={toggleFavoriteMutation.mutate}
          isFavoriteMutating={toggleFavoriteMutation.isPending}
        />
      )}
    </div>
  );
};

export default RestaurantProfilePublic;