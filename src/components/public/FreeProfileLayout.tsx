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
import OrderChannelsSection from './OrderChannelsSection';
import RestaurantInfo from './RestaurantInfo';
import RestaurantPublicHeader from './RestaurantHeader'; // Importando o novo Header

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant }) => {
  const { user } = useAuth();
  // Usamos useFavoriteToggle para gerenciar o status de "Seguir" (que é o mesmo que Favoritar)
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
        {/* Profile Header (Card Flutuante) */}
        <RestaurantPublicHeader
          restaurant={{
            id: restaurant.id,
            name: restaurant.name,
            logoUrl: restaurant.image_url || '',
            addressSummary: restaurant.addressSummary,
            followersCount: restaurant.followers_count,
            isFavorite: restaurant.is_favorite,
          }}
          onFavoriteToggle={toggleFavorite}
          isFavoriteMutating={isToggling}
          onShare={handleShare}
        />

        {/* Conteúdo Principal (Começa logo abaixo do card flutuante) */}
        <div className="mt-6 space-y-6">
          
          {/* Description */}
          {restaurant.description && (
            <Card className="p-4 shadow-soft-md rounded-xl bg-white border-none">
              <p className="text-gray-600">{restaurant.description}</p>
            </Card>
          )}
          
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
          
          {/* 4. Informações Detalhadas (Endereço, Horário, Contato) */}
          <RestaurantInfo 
            id="info-section"
            restaurant={restaurant}
            scheduleDisplay={[]} // Não usado neste componente
            fullAddress={fullAddress}
          />
        </div>
      </div>
    </div>
  );
};

export default FreeProfileLayout;