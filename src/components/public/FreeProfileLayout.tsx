import React, { useMemo } from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Utensils, MapPin, Clock, Heart, Share2, Phone, Mail } from 'lucide-react';
import RestaurantMenu from './RestaurantMenu';
import RestaurantGallery from './RestaurantGallery';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle';
import { formatAddressSummary } from '@/lib/utils';
import { formatOpeningHours } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import OrderChannelsSection from './OrderChannelsSection'; // Importando OrderChannelsSection
import RestaurantInfo from './RestaurantInfo'; // Importando RestaurantInfo

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant }) => {
  const { user } = useAuth();
  const { toggleFavorite, isToggling } = useFavoriteToggle(restaurant.id, restaurant.is_favorite);

  const formattedHours = useMemo(() => {
    if (!restaurant.opening_hours) return 'Horário não definido';
    return formatOpeningHours(restaurant.opening_hours);
  }, [restaurant.opening_hours]);

  const fullAddress = useMemo(() => {
    return formatAddressSummary(
      restaurant.address,
      restaurant.number,
      restaurant.neighborhood,
      restaurant.city,
      restaurant.state
    );
  }, [restaurant]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant.name,
        text: `Confira o perfil de ${restaurant.name}!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  return (
    <div className="min-h-screen bg-background-light">
      {/* Cover Image Section */}
      <div className="relative h-48 bg-gray-300 overflow-hidden shadow-soft-md">
        {restaurant.cover_image_url && (
          <img
            src={restaurant.cover_image_url}
            alt={`Capa de ${restaurant.name}`}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 -mt-12 pb-8">
        {/* Profile Card and Actions (Header) */}
        <Card className="p-6 shadow-soft-xl rounded-2xl bg-white relative">
          <div className="flex items-end justify-between">
            {/* Logo and Name */}
            <div className="flex items-end">
              <div className="w-24 h-24 bg-white border-4 border-white rounded-full shadow-lg -mt-12 flex items-center justify-center overflow-hidden flex-shrink-0">
                {restaurant.image_url ? (
                  <img
                    src={restaurant.image_url}
                    alt={`Logo de ${restaurant.name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Utensils className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <div className="ml-4 pb-2 min-w-0">
                <h1 className="text-2xl font-extrabold text-primary leading-tight truncate">
                  {restaurant.name}
                </h1>
                <p className="text-sm text-gray-500">{restaurant.category}</p>
              </div>
            </div>

            {/* Actions (Favorite/Share) */}
            <div className="flex space-x-2 pb-2 flex-shrink-0">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => toggleFavorite()}
                disabled={!user || isToggling}
                className="rounded-full bg-white hover:bg-gray-50 shadow-soft-sm border-gray-200"
              >
                <Heart 
                  className={cn(`h-5 w-5 transition-colors`, restaurant.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-500')} 
                />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleShare}
                className="rounded-full bg-white hover:bg-gray-50 shadow-soft-sm border-gray-200"
              >
                <Share2 className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Description */}
          {restaurant.description && (
            <p className="mt-4 text-gray-600">{restaurant.description}</p>
          )}

          {/* Info Summary (Mantido aqui para o Free, mas será movido para o final no Premium) */}
          <Separator className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
            {fullAddress && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-highlight" />
                <p className="text-gray-800">{fullAddress}</p>
              </div>
            )}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center space-x-2 hover:text-highlight transition-colors">
                <Phone className="h-4 w-4 text-highlight" />
                <p className="text-gray-800">{restaurant.phone}</p>
              </a>
            )}
            {restaurant.email && (
              <a href={`mailto:${restaurant.email}`} className="flex items-center space-x-2 hover:text-highlight transition-colors">
                <Mail className="h-4 w-4 text-highlight" />
                <p className="text-gray-800">{restaurant.email}</p>
              </a>
            )}
            {restaurant.opening_hours && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-highlight" />
                <p className="text-gray-800">{formattedHours}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Main Content Area - NOVA ORDEM */}
        <div className="mt-6 space-y-6">
          
          {/* 1. Canais de Pedido (Se houver links) */}
          <OrderChannelsSection restaurant={restaurant} />

          {/* 2. Galeria Section */}
          {restaurant.gallery_images && restaurant.gallery_images.length > 0 && (
            <RestaurantGallery
              gallery={restaurant.gallery_images}
            />
          )}
          
          {/* 3. Menu Section */}
          {restaurant.menu_categories && restaurant.menu_categories.length > 0 && (
            <RestaurantMenu
              menuCategories={restaurant.menu_categories}
            />
          )}
          
          {/* 4. Informações Detalhadas (Pagamento, etc.) - Não implementado no Free, mas o espaço está reservado */}
        </div>
      </div>
    </div>
  );
};

export default FreeProfileLayout;