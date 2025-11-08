import React from 'react';
import { Heart, MapPin, Loader2, Utensils } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DEFAULT_RESTAURANT_LOGO_URL } from '@/constants/assets';

interface RestaurantMainInfoCardProps {
  restaurant: {
    id: string;
    name: string;
    logoUrl: string | null;
    addressSummary: string;
    followersCount: number;
    isFavorite: boolean;
    isOpen: boolean;
    statusText: string;
    plan: string;
  };
  onFavoriteToggle: () => void;
  isFavoriteMutating: boolean;
  isCompact?: boolean;
}

const RestaurantMainInfoCard: React.FC<RestaurantMainInfoCardProps> = ({
  restaurant,
  onFavoriteToggle,
  isFavoriteMutating,
  isCompact = false,
}) => {
  const {
    name,
    logoUrl,
    addressSummary,
    followersCount,
    isFavorite,
    isOpen,
    statusText,
    plan,
  } = restaurant;

  // Classes condicionais para tamanho e posição da logo
  // Ajustado para que a logo sobreponha a capa
  const logoSizeClasses = isCompact ? "w-16 h-16 top-12" : "w-24 h-24 md:w-28 md:h-28 top-6";
  const utensilsSizeClasses = isCompact ? "w-8 h-8" : "w-12 h-12";

  // Ajusta o padding superior do card para acomodar a logo sobreposta
  const cardPaddingTopClasses = isCompact ? "pt-[92px]" : "pt-[110px]";

  return (
    <div className="relative -mt-24 z-20 px-4"> {/* Ajusta a posição para sobrepor a capa */}
      {/* Logo do Restaurante - Condicionalmente exibido para planos não-free */}
      {restaurant.plan !== 'free' && logoUrl ? (
        <img
          src={logoUrl || DEFAULT_RESTAURANT_LOGO_URL}
          alt={`Logo de ${name}`}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 rounded-full border-4 border-white shadow-lg object-cover z-30",
            isCompact ? "w-16 h-16 top-16" : "w-24 h-24 md:w-28 md:h-28 top-10"
          )}
        />
      ) : (
        // Placeholder ou nada para planos free sem logo
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center z-30",
          isCompact ? "w-16 h-16 top-16" : "w-24 h-24 md:w-28 md:h-28 top-10"
        )}>
          <Utensils className={cn("text-gray-400", utensilsSizeClasses)} />
        </div>
      )}

      <Card className={cn(
        "pb-4 px-4 shadow-soft-xl rounded-2xl bg-white border border-gray-300 text-left",
        cardPaddingTopClasses // Usa a classe de padding ajustada
      )}>
        <CardContent className="p-0 space-y-2">
          <h1 className={cn(
            "font-extrabold leading-tight text-primary",
            isCompact ? "text-xl" : "text-2xl md:text-3xl"
          )}>{name}</h1>
          
          {/* Endereço e Status de Abertura alinhados */}
          <div className="flex items-center gap-2">
            {addressSummary && (
              <p className={cn(
                "flex items-center text-gray-500",
                isCompact ? "text-xs" : "text-sm md:text-base"
              )}>
                <MapPin className={cn("mr-1 text-primary", isCompact ? "w-3 h-3" : "w-4 h-4")} /> {addressSummary}
              </p>
            )}
            {/* Status de Abertura */}
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-semibold",
                isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}
            >
              {statusText}
            </span>
          </div>

          {/* Grupo de Seguidores e Botão Seguir */}
          <div className="flex items-center justify-between pt-4">
            <span className={cn(
              "flex items-center text-gray-500",
              isCompact ? "text-xs" : "text-sm"
            )}>
              <Heart className={cn("mr-1 fill-gray-700 text-gray-700", isCompact ? "w-3 h-3" : "w-4 h-4")} /> {followersCount} Seguidores
            </span>
            <Button
              variant="highlight"
              size="sm"
              onClick={onFavoriteToggle}
              disabled={isFavoriteMutating}
              className={cn(
                "px-3 py-1",
                isCompact ? "h-7 text-xs" : "h-9 text-sm"
              )}
            >
              {isFavoriteMutating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isFavorite ? 'Seguindo' : 'Seguir'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RestaurantMainInfoCard;