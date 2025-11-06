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
  const h1SizeClass = "text-3xl";

  const isPremium = restaurant.plan === 'premium' || restaurant.plan === 'premium_gift';

  // Construir fullAddress para RestaurantAddressHoursSection
  const fullAddress = [
    restaurant.address,
    restaurant.number,
    restaurant.neighborhood,
    restaurant.city,
    restaurant.state,
    restaurant.cep,
  ].filter(Boolean).join(', ');

  return (
    <div className="relative">
      {/* Capa do Restaurante (apenas para premium) */}
      {isPremium && restaurant.cover_image_url && (
        <div
          className="relative w-full h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${restaurant.cover_image_url})` }}
        >
          {/* Overlay opcional para melhorar a legibilidade do texto sobre a imagem */}
          <div className="absolute inset-0 bg-black opacity-30"></div>
        </div>
      )}

      {/* Conteúdo principal, ajustado para sobrepor a capa se for premium */}
      <div className={cn(
        "relative z-10",
        isPremium ? "-mt-24" : containerPtClass
      )}>
        <div className={cn("bg-gray-50 rounded-b-lg shadow-sm", headerPaddingClass, "relative")}>
          {/* Logo do Restaurante (apenas para premium) */}
          {isPremium && (
            <div className="absolute -top-16 left-4">
              <RestaurantLogo logoUrl={restaurant.image_url || null} size="lg" />
            </div>
          )}

          {/* Conteúdo do cabeçalho, ajustado para dar espaço à logo se for premium */}
          <div className={cn(
            "flex flex-col",
            isPremium ? "pt-20 pl-40" : ""
          )}>
            <h1 className={cn("font-extrabold leading-tight text-primary", h1SizeClass, "mb-2")}>{restaurant.name}</h1>
            <div className="flex items-center text-gray-600 text-sm mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{restaurant.city}, {restaurant.state}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm mb-4">
              <Heart className="h-4 w-4 mr-1" />
              <span>{restaurant.followers_count || 0} Seguidores</span>
              <button
                onClick={toggleFavorite}
                disabled={isFavoriteMutating}
                className={cn(
                  "ml-4 px-3 py-1 rounded-full text-xs",
                  isFavoriteMutating ? "bg-gray-400 cursor-not-allowed" : "bg-orange-500 text-white"
                )}
              >
                {isFavoriteMutating ? "Carregando..." : "Seguindo"}
              </button>
            </div>
            {/* Exemplo de status de abertura, ajuste conforme sua implementação */}
            <p className="text-green-600 text-sm font-medium">Aberto agora até 18:00</p>
          </div>
        </div>

        {/* Conteúdo da página restaurado e adicionado aqui */}
        <div className="p-4 space-y-6">
          <OrderChannelsSection restaurant={restaurant} />
          <RestaurantGallerySection id="gallery-section" restaurantId={restaurant.id} plan={restaurant.plan} />
          <PublicMenuSection restaurantId={restaurant.id} categories={restaurant.menu_categories} />
          <RestaurantAddressHoursSection id="address-hours-section" restaurant={restaurant} fullAddress={fullAddress} paymentMethods={restaurant.payment_methods} />
          <AdditionalInfo restaurant={restaurant} />
        </div>
      </div>
    </div>
  );
};

export default FreeProfileLayout;