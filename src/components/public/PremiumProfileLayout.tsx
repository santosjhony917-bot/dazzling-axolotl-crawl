import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { MapPin, Phone, Mail, Clock, ExternalLink, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import RestaurantInfo from '@/components/public/RestaurantInfo';
import { OpeningHoursDisplay } from './OpeningHoursDisplay';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteRestaurant } from '@/hooks/useFavoriteRestaurant';
import { useToast } from '@/components/ui/use-toast';
import { RestaurantGallery } from './RestaurantGallery'; // Mantendo nomeada (assumindo que é exportada assim)
import RestaurantSocialLinks from './RestaurantSocialLinks'; // Corrigido para importação padrão
import { RestaurantMenu } from './RestaurantMenu'; // Mantendo nomeada (assumindo que é exportada assim)
import RestaurantHeader from './RestaurantHeader'; // Corrigido para importação padrão
import { RestaurantFollowers } from './RestaurantFollowers'; // Mantendo nomeada (assumindo que é exportada assim)

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  addressSummary: string;
  scheduleDisplay: string[];
  fullAddress: string;
}

export const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({
  restaurant,
  addressSummary,
  scheduleDisplay,
  fullAddress,
}) => {
  const { session } = useAuth(); 
  const { isFavorite, toggleFavorite, isLoading } = useFavoriteRestaurant(restaurant.id);
  const { toast } = useToast();

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant.name,
        text: `Confira o cardápio de ${restaurant.name}!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copiado!',
        description: 'O link do restaurante foi copiado para a área de transferência.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <RestaurantHeader restaurant={restaurant} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="bg-white shadow-xl rounded-xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
                {restaurant.name}
              </h1>
              {restaurant.category && (
                <p className="text-lg text-highlight font-medium mb-4">{restaurant.category}</p>
              )}
              <p className="text-gray-600 mb-6">{restaurant.description}</p>
            </div>

            <div className="flex space-x-3 mt-4 sm:mt-0 sm:ml-6">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFavorite}
                disabled={!session || isLoading}
                className={cn(
                  'rounded-full transition-colors',
                  isFavorite ? 'bg-red-500 text-white hover:bg-red-600' : 'hover:bg-gray-100'
                )}
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                <Heart className="h-5 w-5 fill-current" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                className="rounded-full hover:bg-gray-100"
                aria-label="Compartilhar"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Seção de Informações Rápidas (Endereço, Horário, Redes) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Endereço */}
            {addressSummary && (
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <p className="text-base font-semibold text-primary">Endereço</p>
                  <p className="text-gray-600 text-sm">{addressSummary}</p>
                </div>
              </div>
            )}

            {/* Horário de Funcionamento */}
            {restaurant.opening_hours && (
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-highlight mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-base font-semibold text-primary">Horário</p>
                  <OpeningHoursDisplay openingHours={restaurant.opening_hours} isSummary={true} /> 
                </div>
              </div>
            )}

            {/* Redes Sociais */}
            <RestaurantSocialLinks restaurant={restaurant} />
          </div>

          <RestaurantFollowers restaurantId={restaurant.id} followersOverride={restaurant.followers_override || 0} />

          <Separator className="my-6" />

          {/* Botão de Cardápio Completo */}
          <div className="text-center mb-8">
            <Link to={`/r/${restaurant.id}/menu`}>
              <Button size="lg" className="w-full sm:w-auto bg-highlight hover:bg-highlight/90 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300">
                Ver Cardápio Completo
              </Button>
            </Link>
          </div>

          {/* Galeria de Imagens */}
          <RestaurantGallery restaurantId={restaurant.id} />

          {/* Menu Preview (3 categorias) */}
          <RestaurantMenu restaurantId={restaurant.id} previewMode={true} />

          {/* Informações Detalhadas (Onde o RestaurantInfo.tsx é usado) */}
          <div className="mt-12">
            <RestaurantInfo
              id="detailed-info"
              restaurant={restaurant}
              scheduleDisplay={scheduleDisplay}
              fullAddress={fullAddress}
            />
          </div>
        </div>
      </div>
    </div>
  );
};