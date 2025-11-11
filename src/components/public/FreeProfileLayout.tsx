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
  console.log("FreeProfileLayout: Renderizando com restaurante:", restaurant.name); // Adicionado para depuração
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
        "relative z-10 mt-20" // Aplica margin-top para afastar o conteúdo do cabeçalho
      )}>
        {/* Refatorado: Removido o card branco, conteúdo centralizado */}
        <div className="flex flex-col items-center text-center px-4 pb-4"> {/* Centraliza o conteúdo horizontalmente e adiciona padding horizontal */}
          {/* Logo do Restaurante - Condicionalmente visível apenas para premium */}
          {isPremium && (
            <div className="mb-4"> {/* Ajusta margin-top e bottom para a logo */}
                <RestaurantLogo logoUrl={restaurant.image_url} size="lg" />
              </div>
          )}

          {/* Conteúdo do cabeçalho */}
          <div className="flex flex-col items-center"> {/* Centraliza o texto */}
            <h1 className={cn("font-extrabold leading-tight text-primary", h1SizeClass, "mb-2")}>{restaurant.name}</h1>
            <div className="flex items-center text-gray-600 text-sm mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{restaurant.city}, {restaurant.state}</span>
            </div>
            <div className="flex items-center justify-center gap-2 mb-2"> {/* Usando gap para espaçamento e centralizando */}
              <Heart className="h-5 w-5 text-red-500" /> {/* Ícone maior e vermelho */}
              <span className="text-lg font-bold text-gray-800">{restaurant.followers_count || 0}</span> {/* Contagem maior e mais forte */}
              <span className="text-gray-600">Seguidores</span>
              <Button
                variant={restaurant.is_favorite ? "outline" : "default"} // 'default' para seguir, 'outline' para seguindo
                size="sm"
                onClick={toggleFavorite}
                disabled={isFavoriteMutating}
                className="ml-2 px-4 py-2 rounded-full text-sm font-semibold" // Botão mais arredondado e com padding
              >
                {isFavoriteMutating ? "Carregando..." : (restaurant.is_favorite ? "Seguindo" : "Seguir")}
              </Button>
            </div>
            {/* Exemplo de status de abertura, ajuste conforme sua implementação */}
            <p className="text-green-600 text-sm font-medium mb-2">Aberto agora até 18:00</p> {/* Adicionado mb-4 para espaçamento */}
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