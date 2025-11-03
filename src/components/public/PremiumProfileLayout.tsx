"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RestaurantProfile, SocialNetworkLink } from '@/types/restaurant'; // Adicionado SocialNetworkLink
import { RestaurantProfileHeader } from './RestaurantProfileHeader';
import RestaurantMenu from './RestaurantMenu';
import RestaurantGallery from './RestaurantGallery';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MapPin } from 'lucide-react'; // Adicionado MapPin
import { useToast } from '@/components/ui/use-toast';
import { calculateDistance } from '@/lib/utils'; // Importação nomeada
import useUserLocation from '@/hooks/useUserLocation'; // Importação padrão
import { useAuth } from '@/hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import RestaurantAddressHoursSection from './RestaurantAddressHoursSection'; // Importação padrão
import RestaurantSocials from './RestaurantSocials'; // Importação padrão

const PremiumProfileLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, user } = useAuth(); // Assumindo que useAuth retorna 'session' e 'user'
  const { userLocation } = useUserLocation();

  const { data: restaurant, isLoading, error, refetch } = useQuery<RestaurantProfile, Error>({
    queryKey: ['restaurant', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_gallery(id, image_url, caption, order_index),
          menu_categories(
            id, name, order_index, is_active, is_popular,
            menu_items(id, name, description, price, image_url, order_index, is_active)
          ),
          user_favorites(id, user_id)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      let followersCount = data.followers_override || 0;
      const { data: countData, error: countError } = await supabase.rpc('count_restaurant_followers', { p_restaurant_id: id });
      if (!countError) {
        followersCount += countData;
      }

      const now = new Date();
      const today = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

      let isOpen = false;
      let statusText = 'Fechado';

      if (data.opening_hours && typeof data.opening_hours === 'object' && data.opening_hours[today]) {
        const dayHours = data.opening_hours[today];
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
      if (userLocation && data.latitude && data.longitude) {
        distance = calculateDistance(userLocation.latitude, userLocation.longitude, data.latitude, data.longitude);
      }

      const is_favorite = data.user_favorites.length > 0;

      const addressParts = [];
      if (data.address) addressParts.push(data.address);
      if (data.number) addressParts.push(data.number);
      if (data.neighborhood) addressParts.push(data.neighborhood);
      if (data.city) addressParts.push(data.city);
      if (data.state) addressParts.push(data.state);
      const fullAddress = addressParts.join(', ');

      const addressSummaryParts = [];
      if (data.city) addressSummaryParts.push(data.city);
      if (data.state) addressSummaryParts.push(data.state);
      const addressSummary = addressSummaryParts.join(', ');

      return {
        ...data,
        followers_count: followersCount,
        isOpen,
        statusText,
        distance,
        is_favorite,
        fullAddress,
        addressSummary,
        menu_categories: data.menu_categories?.sort((a, b) => a.order_index - b.order_index) || [],
        social_networks: (data.social_networks as SocialNetworkLink[] || null), // Cast para o tipo correto
      };
    },
    enabled: !!id,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user) { // Usar session?.user para verificar autenticação
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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant?.name || 'Restaurante',
        text: `Confira este restaurante: ${restaurant?.name}`,
        url: window.location.href,
      })
        .then(() => console.log('Compartilhado com sucesso'))
        .catch((error) => console.error('Erro ao compartilhar:', error));
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copiado!",
        description: "O link do restaurante foi copiado para a sua área de transferência.",
      });
    }
  };

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
        <p>Erro ao carregar o restaurante: {error.message}</p>
        <button onClick={() => navigate('/')} className="mt-4 text-primary hover:underline">Voltar para a página inicial</button>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center p-4 text-gray-500">
        <p>Restaurante não encontrado.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-primary hover:underline">Voltar para a página inicial</button>
      </div>
    );
  }

  const addressItems = [
    {
      icon: <MapPin className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />,
      value: restaurant.fullAddress,
      link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.fullAddress)}`,
      isExternal: true,
    },
  ];

  const paymentMethods = ['PIX', 'Débito', 'Crédito', 'Dinheiro']; // Exemplo, buscar do restaurante real

  return (
    <div className="min-h-screen bg-gray-100">
      <RestaurantProfileHeader
        restaurant={restaurant}
        isPremium={true} // Este layout é para premium, então isPremium é true
        toggleFavorite={toggleFavoriteMutation.mutate}
        isFavoriteMutating={toggleFavoriteMutation.isPending}
        handleShare={handleShare}
        addressItems={addressItems}
        fullAddress={restaurant.fullAddress}
        paymentMethods={paymentMethods}
      />

      <div className="container mx-auto mt-6 px-4">
        <Tabs defaultValue="menu" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="menu">Cardápio</TabsTrigger>
            <TabsTrigger value="info">Informações</TabsTrigger>
          </TabsList>
          <TabsContent value="menu">
            <RestaurantMenu restaurant={restaurant} />
          </TabsContent>
          <TabsContent value="info">
            <div className="space-y-6">
              <RestaurantAddressHoursSection
                restaurant={restaurant}
                addressItems={addressItems}
                fullAddress={restaurant.fullAddress}
                paymentMethods={paymentMethods}
              />
              {restaurant.restaurant_gallery && restaurant.restaurant_gallery.length > 0 && (
                <RestaurantGallery gallery={restaurant.restaurant_gallery} />
              )}
              {restaurant.social_networks && restaurant.social_networks.length > 0 && (
                <RestaurantSocials socialNetworks={restaurant.social_networks} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;