import React from 'react';
import { Heart, MapPin, Loader2, Utensils } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuthData } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PublicRestaurantData } from '@/types/restaurant';
import { Button } from '@/components/ui/button';
import RestaurantLogo from '@/components/public/RestaurantLogo';

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
  onViewMenu?: () => void;
}

const RestaurantMainInfoCard: React.FC<RestaurantMainInfoCardProps> = ({
  restaurant,
  onFavoriteToggle,
  isFavoriteMutating,
  isCompact = false,
  onViewMenu,
}) => {
  const { user } = useAuthData();
  const navigate = useNavigate();

  const cardPaddingTopClasses = isCompact ? "pt-10" : "pt-12"; // Ajuste o padding superior para acomodar o logo md (80px)

  return (
    <div className="relative">
      {/* Logo do Restaurante */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-30"> {/* Posicionado simetricamente: 40px acima, 40px abaixo */}
        <RestaurantLogo
          logoUrl={restaurant.logoUrl}
          size="md" // Usar md (80px) sempre para ser proporcional no mobile
        />
      </div>
      <Card className={cn(
        "pb-5 px-6 shadow-[0_16px_48px_rgba(0,0,0,0.08)] rounded-[24px] bg-white border border-slate-100/60 text-center",
        cardPaddingTopClasses
      )}>
        <div className="flex flex-col items-center pt-2">
          {(restaurant.plan === 'premium' || restaurant.plan === 'premium_gift') && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase mb-1.5"
              style={{ background: 'linear-gradient(90deg, #F5A623, #FFD700, #F5A623)', backgroundSize: '200% 100%', animation: 'shimmer 2s ease-in-out infinite', color: '#7A4F00', boxShadow: '0 2px 12px rgba(245,166,35,0.35)' }}
            >
              ✦ Premium Gold
            </span>
          )}
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-1 tracking-tight">{restaurant.name}</h1>
          {restaurant.addressSummary && (
            <p className="text-xs text-gray-600 mt-1 flex items-center">
              <MapPin className="w-3 h-3 mr-1 text-gray-500" />
              {restaurant.addressSummary}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-semibold text-gray-700">{restaurant.followersCount} Seguidores</span>
            <Separator orientation="vertical" className="h-4" />
            <span className={cn(
              "text-xs font-semibold",
              restaurant.isOpen ? "text-green-600" : "text-red-600"
            )}>
              {restaurant.statusText}
            </span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-center items-center gap-3 mt-5">
          {(restaurant.plan === 'premium' || restaurant.plan === 'premium_gift') ? (
            <>
              <Button
                variant="highlight"
                size="default"
                onClick={onViewMenu || (() => navigate(`/restaurant/${restaurant.id}/menu`))}
                className={cn(
                  "flex-1 text-white bg-[#EF2A39] hover:bg-[#EF2A39]/90 transition-all duration-300 active:scale-95 font-bold",
                  isCompact 
                    ? "rounded-xl h-9 text-xs shadow-[0_4px_12px_rgba(239,42,57,0.25)]" 
                    : "rounded-full h-12 text-sm shadow-[0_8px_20px_rgba(239,42,57,0.35)] hover:shadow-[0_12px_28px_rgba(239,42,57,0.45)]"
                )}
              >
                Ver Cardápio
              </Button>
              <Button
                variant="outline"
                onClick={onFavoriteToggle}
                disabled={isFavoriteMutating || !user}
                className={cn(
                  "rounded-full p-0 flex items-center justify-center border transition-all duration-200 active:scale-90 shrink-0",
                  isCompact ? "w-9 h-9" : "w-11 h-11",
                  restaurant.isFavorite 
                    ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" 
                    : "border-slate-200 text-slate-500 hover:bg-background-light"
                )}
                title={restaurant.isFavorite ? "Seguindo" : "Seguir"}
              >
                {isFavoriteMutating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <Heart className={cn("w-5 h-5", restaurant.isFavorite && "fill-red-600")} />
                )}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onFavoriteToggle}
              disabled={isFavoriteMutating || !user}
              className={cn(
                "rounded-full px-6 py-2 text-sm font-semibold",
                restaurant.isFavorite ? "bg-red-50 text-red-600 border-red-300 hover:bg-red-100" : "text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              {isFavoriteMutating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : restaurant.isFavorite ? (
                <Heart className="w-4 h-4 mr-2 fill-red-600" />
              ) : (
                <Heart className="w-4 h-4 mr-2" />
              )}
              {restaurant.isFavorite ? "Seguindo" : "Seguir"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default RestaurantMainInfoCard;