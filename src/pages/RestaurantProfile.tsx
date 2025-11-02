import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Phone, Clock, Utensils, DollarSign, Share2, Heart, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { createPageUrl } from '@/utils/url';
import RestaurantInfo from '@/components/restaurant/RestaurantInfo';
import RestaurantMenu from '@/components/restaurant/RestaurantMenu';
import RestaurantGallery from '@/components/restaurant/RestaurantGallery';
import { useRestaurantData } from '@/hooks/useRestaurantData';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthData } from '@/context/AuthContext';
import { base44 } from '@/integrations/base44Client';
import { showError, showSuccess } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';

interface RestaurantType { // Definindo a interface completa para o restaurante
  id: string;
  user_id: string;
  name: string;
  description: string;
  image_url: string;
  cover_image_url: string;
  plan: 'free' | 'basic' | 'premium';
  phone: string;
  email: string;
  cnpj: string;
  category: string;
  whatsapp_url: string;
  ifood_url: string;
  other_url: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  latitude: number;
  longitude: number;
  opening_hours: any;
  created_at: string;
  external_url: string;
  followers_override: number;
  payment_methods: any;
  social_networks: { platform: string; url: string }[];
  is_favorited?: boolean;
}

export default function RestaurantProfile() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthData();
  const queryClient = useQueryClient();

  const { restaurant, isLoading, error, refetch } = useRestaurantData(restaurantId);

  const isPremium = restaurant?.plan === 'premium';

  const handleFavoriteToggle = async () => {
    if (!user) {
      navigate(createPageUrl('auth'));
      return;
    }

    if (!restaurantId) {
      showError("ID do restaurante não encontrado.");
      return;
    }

    try {
      if (restaurant?.is_favorited) {
        await base44.userFavorites.removeFavorite(restaurantId);
        showSuccess("Restaurante removido dos favoritos!");
      } else {
        await base44.userFavorites.addFavorite(restaurantId);
        showSuccess("Restaurante adicionado aos favoritos!");
      }
      queryClient.invalidateQueries({ queryKey: ['restaurantData', restaurantId] });
      refetch(); // Refetch para atualizar o estado do favorito
    } catch (err: any) {
      console.error("Erro ao alternar favorito:", err);
      showError("Falha ao atualizar favoritos. Tente novamente.");
    }
  };

  if (isLoading) {
    return (
      <div className="md:max-w-md md:mx-auto">
        <Skeleton className="w-full h-48 rounded-b-2xl" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="p-4 text-center text-red-600 md:max-w-md md:mx-auto">
        <p>Erro ao carregar perfil do restaurante: {error?.message || "Restaurante não encontrado."}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">Voltar</Button>
      </div>
    );
  }

  // Usar o tipo RestaurantType para o objeto restaurant
  const typedRestaurant: RestaurantType = restaurant;

  return (
    <div className="bg-white min-h-screen pb-20 md:max-w-md md:mx-auto">
      {/* Imagem de Capa */}
      <div className="relative w-full h-48 bg-gray-200 rounded-b-2xl overflow-hidden">
        <img
          src={typedRestaurant.cover_image_url || 'https://via.placeholder.com/600x400?text=Capa+do+Restaurante'}
          alt={`Capa de ${typedRestaurant.name}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-4 left-4 text-white">
          <h1 className="text-3xl font-bold">{typedRestaurant.name}</h1>
          <p className="text-sm flex items-center gap-1">
            <MapPin size={16} /> {typedRestaurant.city}, {typedRestaurant.state}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 bg-white/30 hover:bg-white/50 text-white"
          onClick={handleFavoriteToggle}
        >
          <Heart fill={typedRestaurant.is_favorited ? "red" : "white"} stroke={typedRestaurant.is_favorited ? "red" : "white"} />
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Informações Básicas */}
        <RestaurantInfo restaurant={typedRestaurant} />

        <Separator />

        {/* Cardápio */}
        <RestaurantMenu restaurantId={typedRestaurant.id} />

        {/* Galeria de Fotos (apenas para premium) */}
        {isPremium && (
          <>
            <Separator />
            <RestaurantGallery restaurantId={typedRestaurant.id} />
          </>
        )}
      </div>
    </div>
  );
}