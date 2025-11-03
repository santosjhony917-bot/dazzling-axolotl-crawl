import React from 'react';
import { PublicRestaurantData } from '@/pages/RestaurantProfilePublic';
import OrderChannelsSection from './OrderChannelsSection';
import MenuSection from './MenuSection';
import GallerySection from './GallerySection';
import AboutSection from './AboutSection';
import ReviewsSection from './ReviewsSection';
import MapSection from './MapSection';
import RestaurantProfileHeader from './RestaurantProfileHeader';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  isPremium: boolean;
  onFavoriteToggle: () => void;
  isFavoriteMutating: boolean;
  handleShare: () => void;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({
  restaurant,
  isPremium,
  onFavoriteToggle,
  isFavoriteMutating,
  handleShare,
}) => {
  const layoutProps = {
    restaurant: restaurant,
    isPremium: isPremium,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <RestaurantProfileHeader
        restaurant={{
          id: restaurant.id,
          name: restaurant.name,
          logoUrl: restaurant.image_url || '',
          coverImageUrl: restaurant.cover_image_url || '',
          addressSummary: restaurant.addressSummary,
          followersCount: restaurant.followers_count || 0,
          isFavorite: restaurant.is_favorite,
          isOpen: restaurant.is_open,
          statusText: restaurant.status_text,
          isPremium: isPremium,
        }}
        onFavoriteToggle={onFavoriteToggle}
        isFavoriteMutating={isFavoriteMutating}
      />

      <div className="container mx-auto px-4 -mt-10 relative z-10">
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
          <div className="flex justify-end space-x-2 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={onFavoriteToggle}
              disabled={isFavoriteMutating}
              className={cn(
                'rounded-full',
                restaurant.is_favorite && 'bg-red-50 text-red-600 hover:bg-red-100'
              )}
            >
              <Heart
                className={cn(
                  'w-5 h-5',
                  restaurant.is_favorite ? 'fill-red-600' : 'text-gray-600'
                )}
              />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare} className="rounded-full">
              <Share2 className="w-5 h-5 text-gray-600" />
            </Button>
          </div>

          {/* Seção de Canais de Pedido - Visível apenas para Premium */}
          {isPremium && (
            <>
              <OrderChannelsSection {...layoutProps} />
              <Separator className="my-6" />
            </>
          )}

          {/* Seção do Menu */}
          <MenuSection {...layoutProps} />

          {/* Seção da Galeria - Visível apenas para Premium */}
          {isPremium && (
            <>
              <Separator className="my-6" />
              <GallerySection {...layoutProps} />
            </>
          )}

          {/* Seção Sobre */}
          <Separator className="my-6" />
          <AboutSection {...layoutProps} />

          {/* Seção de Avaliações - Visível apenas para Premium */}
          {isPremium && (
            <>
              <Separator className="my-6" />
              <ReviewsSection {...layoutProps} />
            </>
          )}

          {/* Seção do Mapa - Visível apenas para Premium */}
          {isPremium && restaurant.latitude && restaurant.longitude && (
            <>
              <Separator className="my-6" />
              <MapSection {...layoutProps} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FreeProfileLayout;