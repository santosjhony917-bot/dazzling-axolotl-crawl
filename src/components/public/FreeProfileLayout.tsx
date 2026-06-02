"use client";

import { cn } from "@/lib/utils";
import { MapPin, Heart } from "lucide-react";
import React from "react";
import RestaurantLogo from './RestaurantLogo';
import OrderChannelsSection from './OrderChannelsSection';
import RestaurantGallerySection from './RestaurantGallerySection';
import PublicMenuSection from './PublicMenuSection';
import RestaurantAddressHoursSection from './RestaurantAddressHoursSection';
import AdditionalInfo from './AdditionalInfo';
import { PublicRestaurantData } from "@/types/restaurant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getRestaurantOpenStatus } from '@/lib/schedule';

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact?: boolean; // Tornando isCompact opcional, pois não é usado diretamente aqui
}

const FreeProfileLayout = ({
  restaurant,
  toggleFavorite,
  isFavoriteMutating,
}: FreeProfileLayoutProps) => {
  const containerPtClass = "pt-4";
  const headerPaddingClass = "p-4";
  const h1SizeClass = "text-2xl"; // Reduzido ligeiramente de 3xl para 2xl para caber confortavelmente no card

  const isPremium = restaurant.plan === 'premium' || restaurant.plan === 'premium_gift';

  const openStatus = getRestaurantOpenStatus(restaurant.opening_hours);

  // Construir fullAddress para RestaurantAddressHoursSection
  const fullAddress = [
    restaurant.address,
    restaurant.number,
    restaurant.neighborhood,
    restaurant.city,
    restaurant.state,
    restaurant.cep,
  ].filter(Boolean).join(', ');

  // Dados para o RestaurantProfileHeader
  const headerData = {
    id: restaurant.id,
    name: restaurant.name,
    coverImageUrl: isPremium ? restaurant.cover_image_url : null, // Oculta a capa para planos free
    isPremium: isPremium,
    isCompact: false,
  };

  return (
    <div className="relative">
      {/* Conteúdo principal, ajustado para sobrepor a capa */}
      <div className={cn(
        "relative z-10 mt-6" // Reduzido margin-top para afastar o conteúdo do cabeçalho de forma equilibrada
      )}>
        <div className="px-4 pb-2">
          {/* Card simples para agrupar as informações básicas do restaurante no plano Free */}
          <Card className="p-5 border border-gray-100 bg-white rounded-2xl shadow-sm text-center flex flex-col items-center w-full">
            {/* Logo do Restaurante - Condicionalmente visível apenas para premium */}
            {isPremium && (
              <div className="mb-4">
                <RestaurantLogo logoUrl={restaurant.image_url} size="lg" />
              </div>
            )}

            {/* Conteúdo do cabeçalho */}
            <div className="flex flex-col items-center">
              <h1 className={cn("font-extrabold leading-tight text-primary", h1SizeClass, "mb-2")}>{restaurant.name}</h1>
              <div className="flex items-center text-gray-600 text-sm mb-2">
                <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                <span>{restaurant.city}, {restaurant.state}</span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
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
              {/* Status de abertura */}
              <p className={cn(
                "text-sm font-medium",
                openStatus.isOpen ? "text-green-600" : "text-red-500"
              )}>
                {openStatus.isOpen 
                  ? openStatus.statusText 
                  : (openStatus.nextOpenTime ? `${openStatus.statusText} • ${openStatus.nextOpenTime}` : openStatus.statusText)
                }
              </p>
            </div>
          </Card>
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