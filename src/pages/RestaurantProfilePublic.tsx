"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import RestaurantProfileHeader, {
  RestaurantProfileHeaderProps,
} from '@/components/public/RestaurantProfileHeader';
import OrderChannelsSection from '@/components/public/OrderChannelsSection';
import MenuSection from '@/components/public/MenuSection';
import GallerySection from '@/components/public/GallerySection';
import AboutSection from '@/components/public/AboutSection';
import ReviewsSection from '@/components/public/ReviewsSection';
import MapSection from '@/components/public/MapSection';
import { Button } from '@/components/ui/button';
import { Heart, Share2 } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export interface PublicRestaurantData {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  plan: 'free' | 'basic' | 'premium' | 'premium_gift';
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  category: string | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: any | null;
  created_at: string;
  external_url: string | null;
  followers_override: number | null;
  payment_methods: any | null;
  social_networks: any | null;
  is_favorite: boolean;
  followers_count: number;
  is_open: boolean;
  status_text: string;
  addressSummary: string; // Adicionado para corrigir o erro de tipagem
  menu_categories?: Array<{
    id: string;
    name: string;
    order_index: number | null;
    is_active: boolean;
    is_popular: boolean;
    menu_items?: Array<{
      id: string;
      name: string;
      description: string | null;
      price: number;
      image_url: string | null;
      order_index: number | null;
      is_active: boolean;
      menu_item_favorites?: Array<{ id: string }>;
    }>;
  }>;
  restaurant_gallery?: Array<{
    id: string;
    image_url: string;
    caption: string | null;
    order_index: number | null;
  }>;
}

const fetchRestaurant = async (id: string, userId: string | undefined): Promise<PublicRestaurantData> => {
  let query = supabase
    .from('restaurants')
    .select(
      `
      *,
      user_favorites(id),
      menu_categories(
        id,
        name,
        order_index,
        is_active,
        is_popular,
        menu_items(
          id,
          name,
          description,
          price,
          image_url,
          order_index,
          is_active,
          menu_item_favorites(id)
        )
      ),
      restaurant_gallery(id, image_url, caption, order_index)
    `
    )
    .eq('id', id)
    .single();

  const { data, error } = await query;

  if (error) throw error;

  const isFavorite = (data.user_favorites as any[]).length > 0;
  const followersCount =
    (data.followers_override || 0) +
    (await supabase
      .from('user_favorites')
      .select('*', { count: 'exact' })
      .eq('restaurant_id', id)).count;

  // Mock opening hours and status for now
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 for Sunday, 1 for Monday, etc.
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const openingHours = data.opening_hours; // Assuming this is an object with days as keys

  let isOpen = false;
  let statusText = 'Fechado';

  if (openingHours && openingHours[dayOfWeek]) {
    const daySchedule = openingHours[dayOfWeek];
    if (daySchedule.is_open) {
      const openTime = daySchedule.open.split(':').map(Number);
      const closeTime = daySchedule.close.split(':').map(Number);

      const openHour = openTime[0];
      const openMinute = openTime[1];
      const closeHour = closeTime[0];
      const closeMinute = closeTime[1];

      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const openTimeInMinutes = openHour * 60 + openMinute;
      const closeTimeInMinutes = closeHour * 60 + closeMinute;

      if (
        currentTimeInMinutes >= openTimeInMinutes &&
        currentTimeInMinutes <= closeTimeInMinutes
      ) {
        isOpen = true;
        statusText = 'Aberto';
      }
    }
  }

  const addressSummary = [data.address, data.number, data.neighborhood, data.city, data.state]
    .filter(Boolean)
    .join(', ');

  return {
    ...data,
    is_favorite: isFavorite,
    followers_count: followersCount,
    is_open: isOpen,
    status_text: statusText,
    addressSummary: addressSummary,
    menu_categories: data.menu_categories || [],
    restaurant_gallery: data.restaurant_gallery || [],
  } as PublicRestaurantData; // Cast to ensure all properties are present
};

interface RestaurantProfilePublicProps {
  initialRestaurantId?: string;
  simulatedPlan?: 'free' | 'basic' | 'premium' | 'premium_gift';
}

const RestaurantProfilePublic: React.FC<RestaurantProfilePublicProps> = ({
  initialRestaurantId,
  simulatedPlan: propSimulatedPlan,
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const restaurantId = initialRestaurantId || paramId;
  const { user } = useAuthData();
  const queryClient = useQueryClient();

  const [simulatedPlanState, setSimulatedPlanState] = useState<
    'free' | 'basic' | 'premium' | 'premium_gift' | null
  >(propSimulatedPlan || null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const {
    data: restaurant,
    isLoading,
    error,
  } = useQuery<PublicRestaurantData>({
    queryKey: ['restaurant', restaurantId, user?.id],
    queryFn: () => fetchRestaurant(restaurantId!, user?.id),
    enabled: !!restaurantId,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error('Você precisa estar logado para favoritar um restaurante.');
        return;
      }

      if (!restaurant) return;

      if (restaurant.is_favorite) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('restaurant_id', restaurant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, restaurant_id: restaurant.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId, user?.id] });
      toast.success(
        restaurant?.is_favorite
          ? 'Restaurante removido dos favoritos!'
          : 'Restaurante adicionado aos favoritos!'
      );
    },
    onError: (err) => {
      toast.error(`Erro ao favoritar/desfavoritar: ${err.message}`);
    },
  });

  const handleFavoriteToggle = () => {
    toggleFavoriteMutation.mutate();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: restaurant?.name || 'Restaurante',
          text: `Confira este restaurante: ${restaurant?.name}`,
          url: window.location.href,
        })
        .catch((error) => console.error('Erro ao compartilhar:', error));
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="w-full h-64 md:h-80" />
        <div className="mt-4 space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="container mx-auto p-4 text-center text-red-500">
        <p>Erro ao carregar o restaurante: {error?.message}</p>
      </div>
    );
  }

  // Determina o plano a ser usado para renderização (simulado ou real)
  const planToRender = simulatedPlanState || restaurant.plan;

  // Criamos uma versão dos dados do restaurante que inclui o estado reativo de favorito E o plano a ser renderizado
  const reactiveRestaurantData: PublicRestaurantData = {
    ...restaurant,
    is_favorite: restaurant.is_favorite, // Usar o estado do useQuery para is_favorite
    followers_count: restaurant.followers_count, // Usar o estado do useQuery para followers_count
    is_open: restaurant.is_open,
    status_text: restaurant.status_text,
    addressSummary: restaurant.addressSummary,
    plan: planToRender, // Sobrescreve o plano original com o plano simulado, se houver
  };

  // Calcula isPremium com base no planToRender
  const isPremiumToHeader = planToRender === 'premium' || planToRender === 'premium_gift';

  // Props comuns para os layouts
  const layoutProps = {
    restaurant: reactiveRestaurantData,
    isPremium: isPremiumToHeader,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <RestaurantProfileHeader
        restaurant={{
          id: reactiveRestaurantData.id,
          name: reactiveRestaurantData.name,
          logoUrl: reactiveRestaurantData.image_url || '',
          coverImageUrl: reactiveRestaurantData.cover_image_url || '',
          addressSummary: reactiveRestaurantData.addressSummary,
          followersCount: reactiveRestaurantData.followers_count || 0,
          isFavorite: reactiveRestaurantData.is_favorite,
          isOpen: reactiveRestaurantData.is_open,
          statusText: reactiveRestaurantData.status_text,
          isPremium: isPremiumToHeader, // Garante que isPremium é passado corretamente
        }}
        onFavoriteToggle={handleFavoriteToggle}
        isFavoriteMutating={toggleFavoriteMutation.isPending}
      />

      <div className="container mx-auto px-4 -mt-10 relative z-10">
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
          <div className="flex justify-end space-x-2 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleFavoriteToggle}
              disabled={toggleFavoriteMutation.isPending}
              className={cn(
                'rounded-full',
                reactiveRestaurantData.is_favorite && 'bg-red-50 text-red-600 hover:bg-red-100'
              )}
            >
              <Heart
                className={cn(
                  'w-5 h-5',
                  reactiveRestaurantData.is_favorite ? 'fill-red-600' : 'text-gray-600'
                )}
              />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare} className="rounded-full">
              <Share2 className="w-5 h-5 text-gray-600" />
            </Button>
          </div>

          {/* Seção de Canais de Pedido - Visível apenas para Premium */}
          {isPremiumToHeader && (
            <>
              <OrderChannelsSection {...layoutProps} />
              <Separator className="my-6" />
            </>
          )}

          {/* Seção do Menu */}
          <MenuSection {...layoutProps} />

          {/* Seção da Galeria - Visível apenas para Premium */}
          {isPremiumToHeader && (
            <>
              <Separator className="my-6" />
              <GallerySection {...layoutProps} />
            </>
          )}

          {/* Seção Sobre */}
          <Separator className="my-6" />
          <AboutSection {...layoutProps} />

          {/* Seção de Avaliações - Visível apenas para Premium */}
          {isPremiumToHeader && (
            <>
              <Separator className="my-6" />
              <ReviewsSection {...layoutProps} />
            </>
          )}

          {/* Seção do Mapa - Visível apenas para Premium */}
          {isPremiumToHeader && reactiveRestaurantData.latitude && reactiveRestaurantData.longitude && (
            <>
              <Separator className="my-6" />
              <MapSection {...layoutProps} />
            </>
          )}

          {/* Botão de Upgrade para planos Free/Basic */}
          {!isPremiumToHeader && (
            <div className="mt-8 text-center">
              <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white">
                    Faça Upgrade para o Plano Premium!
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Visualizar como Premium</DialogTitle>
                    <DialogDescription>
                      Veja como seu perfil ficaria com os recursos do plano Premium.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="premium-preview"
                        checked={simulatedPlanState === 'premium'}
                        onCheckedChange={(checked) =>
                          setSimulatedPlanState(checked ? 'premium' : null)
                        }
                      />
                      <Label htmlFor="premium-preview">Simular Plano Premium</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="premium-gift-preview"
                        checked={simulatedPlanState === 'premium_gift'}
                        onCheckedChange={(checked) =>
                          setSimulatedPlanState(checked ? 'premium_gift' : null)
                        }
                      />
                      <Label htmlFor="premium-gift-preview">Simular Plano Premium Gift</Label>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfilePublic;