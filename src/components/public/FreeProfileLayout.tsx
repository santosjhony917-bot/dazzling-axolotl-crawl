import React, { useMemo, useState } from 'react';
import { RestaurantProfile } from '@/types/restaurant'; // Corrigido para RestaurantProfile
import { Card } from '@/components/ui/card';
import { MapPin, Heart, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { calculateDistance } from '@/lib/utils';
import useUserLocation from '@/hooks/useUserLocation'; // Importação padrão
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RestaurantMenu from './RestaurantMenu';
import RestaurantAddressHoursSection from './RestaurantAddressHoursSection'; // Importação padrão
import RestaurantSocials from './RestaurantSocials'; // Importação padrão
import RestaurantGallery from './RestaurantGallery';
import OrderChannelsSection from './OrderChannelsSection';
import RestaurantInfo from './RestaurantInfo';
import { Separator } from '@/components/ui/separator';
import OpeningHoursDisplay from './OpeningHoursDisplay';

interface FreeProfileLayoutProps {
  restaurant: RestaurantProfile;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant, toggleFavorite, isFavoriteMutating }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth(); // Assumindo que useAuth retorna 'session'
  const { userLocation } = useUserLocation();

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

  const addressItems = useMemo(() => {
    const items = [];
    if (restaurant.fullAddress) {
      items.push({
        icon: <MapPin className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />,
        value: restaurant.fullAddress,
        link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.fullAddress)}`,
        isExternal: true,
      });
    }
    return items;
  }, [restaurant.fullAddress]);

  const paymentMethods = useMemo(() => {
    if (restaurant.payment_methods && Array.isArray(restaurant.payment_methods)) {
      return restaurant.payment_methods.map((method: any) => method.name || method).filter(Boolean);
    }
    return ['PIX', 'Débito', 'Crédito', 'Dinheiro']; // Fallback ou padrão
  }, [restaurant.payment_methods]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 1. Barra de Ações Flutuante (Sticky) */}
      {/* Removido para o layout FREE, mas mantido no PremiumProfileLayout */}

      {/* NOVO: Informações do Restaurante Renderizadas Diretamente */}
      <div className="container mx-auto pt-20"> {/* Mantém o padding superior */}
        <div className="bg-gray-50 px-4 pb-8 rounded-b-lg shadow-sm"> {/* Nova seção com fundo, padding e sombra */}
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-primary mb-2">{restaurant.name}</h1>

          {restaurant.addressSummary && (
            <p className="flex items-center text-sm md:text-base text-gray-600 mb-2">
              <MapPin className="w-4 h-4 mr-1 text-gray-500" /> {restaurant.addressSummary}
            </p>
          )}

          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center text-sm text-gray-500">
              <Heart className="w-4 h-4 mr-1 fill-gray-400 text-gray-400" /> {restaurant.followers_count} Seguidores
            </span>
            <Button
              variant="default" // Usando variant="default" para um visual mais simples
              size="sm"
              onClick={toggleFavorite}
              disabled={isFavoriteMutating}
              className="px-4 py-2 text-sm"
            >
              {isFavoriteMutating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                restaurant.is_favorite ? 'Seguindo' : 'Seguir'
              )}
            </Button>
          </div>

          {/* Status de Abertura */}
          <span
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold mb-4",
              restaurant.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}
          >
            {restaurant.statusText}
          </span>
        </div>

        {/* Conteúdo Principal */}
        <div className="mt-6 space-y-6 px-4"> {/* Adiciona px-4 para alinhamento */}

          {/* Description */}
          {restaurant.description && (
            <Card className="p-4 shadow-soft-md rounded-xl bg-white border border-gray-300">
              <h2 className="text-2xl font-bold text-primary mb-3">Sobre</h2>
              <p className="text-gray-600">{restaurant.description}</p>
            </Card>
          )}

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
                <OrderChannelsSection restaurant={restaurant} />
                <RestaurantInfo restaurant={restaurant} />
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
    </div>
  );
};

export default FreeProfileLayout;