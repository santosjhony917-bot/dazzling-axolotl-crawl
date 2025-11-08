"use client";

import { cn } from "@/lib/utils";
import { MapPin, Heart } from "lucide-react";
import React from "react";
import { PublicRestaurantData } from "@/types/restaurant";
import { Button } from "@/components/ui/button";
import RestaurantMainInfoCard from './RestaurantMainInfoCard';
import RestaurantCoverImage from './RestaurantCoverImage';
import RestaurantLogo from './RestaurantLogo';

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  children: React.ReactNode;
  onFavoriteToggle: () => void;
  isFavoriteMutating: boolean;
  isFavorite: boolean;
  isCompact?: boolean; // Adicionado
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({
  restaurant,
  children,
  onFavoriteToggle,
  isFavoriteMutating,
  isFavorite,
  isCompact,
}) => {
  const { name, cover_image_url, image_url, address, city, state, latitude, longitude, plan } = restaurant;

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Imagem de Capa */}
      <RestaurantCoverImage coverImageUrl={cover_image_url} altText={`Capa de ${name}`} />

      {/* Conteúdo principal, ajustado para sobrepor a capa */}
      <div className={cn(
        "relative z-10 pt-24"
      )}>
        {/* Refatorado: Removido o card branco, conteúdo centralizado */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Informações principais do restaurante (logo, nome, endereço, status, seguir) */}
          {/* O RestaurantMainInfoCard agora é renderizado diretamente aqui para o layout free */}
          <RestaurantMainInfoCard
            restaurant={{
              id: restaurant.id,
              name: restaurant.name,
              logoUrl: restaurant.image_url,
              addressSummary: `${restaurant.address || ''}, ${restaurant.city || ''} - ${restaurant.state || ''}`,
              followersCount: restaurant.followers_count || 0,
              isFavorite: isFavorite,
              isOpen: restaurant.isOpen,
              statusText: restaurant.statusText,
              plan: restaurant.plan,
            }}
            onFavoriteToggle={onFavoriteToggle}
            isFavoriteMutating={isFavoriteMutating}
            isCompact={false} // Manter como false para o layout principal
          />

          {/* Seções de conteúdo */}
          <div className="mt-8 space-y-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeProfileLayout;