"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types'; // Importar PublicRestaurantData
import RestaurantLogo from '@/components/public/RestaurantLogo';
import OrderChannelsSection from '@/components/public/OrderChannelsSection';
import PublicMenuSection from '@/components/public/PublicMenuSection';
import RestaurantAddressHoursSection from '@/components/public/RestaurantAddressHoursSection';
import RestaurantGallerySection from '@/components/public/RestaurantGallerySection';
import AdditionalInfo from '@/components/public/AdditionalInfo';
import { cn } from '@/lib/utils';
import { Heart, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RestaurantPageHeader from '@/components/public/RestaurantPageHeader'; // Importar o cabeçalho de botões

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact: boolean;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({
  restaurant,
  toggleFavorite,
  isFavoriteMutating,
  isCompact,
}) => {
  const isPremium = restaurant.plan === 'premium'; // Embora seja FreeProfileLayout, a prop isPremium pode ser útil para lógica interna
  const h1SizeClass = isCompact ? "text-2xl" : "text-3xl";
  const fullAddress = `${restaurant.address || ''}, ${restaurant.number || ''} - ${restaurant.neighborhood || ''}, ${restaurant.city || ''} - ${restaurant.state || ''}, ${restaurant.cep || ''}`;

  return (
    <div className="relative">
      {/* Cabeçalho de botões (Voltar/Compartilhar) como o primeiro elemento */}
      <RestaurantPageHeader />

      {/* Conteúdo principal, ajustado para começar abaixo do cabeçalho */}
      <div className="relative z-10">
        <div className="flex flex-col items-center text-center px-4 pb-4">
          {/* Logo do Restaurante - Condicionalmente visível apenas para premium (se houver lógica para isso) */}
          {isPremium && ( // Mantido para consistência, embora este seja o layout FREE
            <div className="mb-4">
                <RestaurantLogo logoUrl={restaurant.image_url} size="lg" />
              </div>
          )}

          {/* Conteúdo do cabeçalho */}
          <div className="flex flex-col items-center">
            <h1 className={cn("font-extrabold leading-tight text-primary", h1SizeClass, "mb-2")}>{restaurant.name}</h1>
            <div className="flex items-center text-gray-600 text-sm mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{restaurant.city}, {restaurant.state}</span>
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="h-5 w-5 text-red-500" />
              <span className="text-lg font-bold text-gray-800">{restaurant.followers_count || 0}</span>
              <span className="text-gray-600">Seguidores</span>
              <Button
                variant={restaurant.is_favorite ? "outline" : "default"}
                size="sm"
                onClick={toggleFavorite}
                disabled={isFavoriteMutating}
                className="ml-2 px-4 py-2 rounded-full text-sm font-semibold"
              >
                {isFavoriteMutating ? "Carregando..." : (restaurant.is_favorite ? "Seguindo" : "Seguir")}
              </Button>
            </div>
            {/* Exemplo de status de abertura, ajuste conforme sua implementação */}
            <p className="text-green-600 text-sm font-medium mb-2">Aberto agora até 18:00</p>
          </div>
        </div>

        {/* Conteúdo da página restaurado e adicionado aqui */}
        <div className="p-4 space-y-8">
          {isPremium && <OrderChannelsSection restaurant={restaurant} />}
          {isPremium && <RestaurantGallerySection id="gallery-section" restaurantId={restaurant.id} plan={restaurant.plan} />}
          <PublicMenuSection restaurantId={restaurant.id} categories={restaurant.menu_categories} />
          <RestaurantAddressHoursSection id="address-hours-section" restaurant={restaurant} fullAddress={fullAddress} paymentMethods={restaurant.payment_methods} />
          {isPremium && <AdditionalInfo restaurant={restaurant} />}
        </div>
      </div>
    </div>
  );
};

export default FreeProfileLayout;