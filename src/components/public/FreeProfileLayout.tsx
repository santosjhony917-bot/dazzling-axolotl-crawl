"use client";

import { cn } from "@/lib/utils";
import { MapPin, Heart } from "lucide-react";
import React from "react";

// Define a basic interface for PublicRestaurantData based on its usage
interface PublicRestaurantData {
  id: string;
  name: string;
  city: string;
  state: string;
  followers_override: number;
  plan: 'free' | 'basic' | 'premium' | 'premium_gift'; // Adicionado 'premium_gift'
  cover_image_url?: string;
  image_url?: string;
  // Adicione outras propriedades conforme necessário para o uso neste componente
}

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  children: React.ReactNode;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact: boolean;
}

const FreeProfileLayout = ({
  restaurant,
  children,
  toggleFavorite,
  isFavoriteMutating,
  isCompact,
}: FreeProfileLayoutProps) => {
  const containerPtClass = "pt-4";
  const headerPaddingClass = "p-4";
  const h1SizeClass = "text-3xl";

  const isPremium = restaurant.plan === 'premium' || restaurant.plan === 'premium_gift'; // Considerar premium_gift como premium

  return (
    <div className="relative min-h-screen bg-gray-100">
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
          {isPremium && restaurant.image_url && (
            <div className="absolute -top-16 left-4 w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-200 flex items-center justify-center">
              <img src={restaurant.image_url} alt={`${restaurant.name} logo`} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Conteúdo do cabeçalho, ajustado para dar espaço à logo se for premium */}
          <div className={cn(
            "flex flex-col",
            isPremium ? "pt-20 pl-40" : ""
          )}>
            <h1 className={cn("font-extrabold leading-tight text-primary", h1SizeClass, "mb-2")}>{restaurant.name}</h1>
            {/* Conteúdo existente para localização, seguidores, etc. */}
            <div className="flex items-center text-gray-600 text-sm mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{restaurant.city}, {restaurant.state}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm mb-4">
              <Heart className="h-4 w-4 mr-1" />
              <span>{restaurant.followers_override || 0} Seguidores</span>
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

        {/* Renderiza o restante do conteúdo da página */}
        {children}
      </div>
    </div>
  );
};

export default FreeProfileLayout;