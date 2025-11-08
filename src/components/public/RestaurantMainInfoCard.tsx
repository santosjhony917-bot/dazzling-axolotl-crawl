import React from 'react';
import { Heart, MapPin, Loader2, Utensils } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
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
}

const RestaurantMainInfoCard: React.FC<RestaurantMainInfoCardProps> = ({
  restaurant,
  onFavoriteToggle,
  isFavoriteMutating,
  isCompact = false,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const cardPaddingTopClasses = isCompact ? "pt-16" : "pt-20"; // Ajuste o padding superior para acomodar o logo

  return (
    <div className="relative">
      {/* Logo do Restaurante */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30"> {/* Ajustado -top-12 para subir mais */}
        <RestaurantLogo
          logoUrl={restaurant.logoUrl}
          size={isCompact ? "md" : "lg"}
        />
      </div>

      <Card className={cn(
        "pb-4 px-4 shadow-soft-xl rounded-2xl bg-white border border-gray-300 text-center", // Alterado de text-left para text-center
        cardPaddingTopClasses // Usa a classe de padding ajustada
      )}>
        <div className="flex flex-col items-center pt-4"> {/* Adicionado pt-4 para espaçamento interno */}
          <h1 className="text-2xl font-extrabold text-primary mt-2">{restaurant.name}</h1>
          {restaurant.addressSummary && (
            <p className="text-sm text-gray-600 mt-1 flex items-center">
              <MapPin className="w-3 h-3 mr-1 text-gray-500" />
              {restaurant.addressSummary}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-semibold text-gray-700">{restaurant.followersCount} Seguidores</span>
            <Separator orientation="vertical" className="h-4" />
            <span className={cn(
              "text-sm font-semibold",
              restaurant.isOpen ? "text-green-600" : "text-red-600"
            )}>
              {restaurant.statusText}
            </span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-center gap-3 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onFavoriteToggle}
            disabled={isFavoriteMutating || !user}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
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
          {restaurant.plan === 'premium' && (
            <Button
              variant="highlight"
              size="sm"
              onClick={() => navigate(`/restaurant/${restaurant.id}/menu`)}
              className="rounded-full px-4 py-2 text-sm font-semibold shadow-highlight-glow"
            >
              Ver Cardápio
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default RestaurantMainInfoCard;