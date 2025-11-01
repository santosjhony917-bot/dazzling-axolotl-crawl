import React from 'react';
import { PublicRestaurantData, WeekSchedule, SocialNetworkLink } from '@/types/restaurant';
import RestaurantHeader from './RestaurantHeader';
import RestaurantInfo from './RestaurantInfo';
import MenuSection from './MenuSection';
import OrderChannelsSection from './OrderChannelsSection';
import RestaurantGallery from './RestaurantGallery';
import RestaurantFooter from './RestaurantFooter';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/hooks/useUser';
import FavoriteButton from '../FavoriteButton';
import { cn } from '@/lib/utils';

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  isOwner: boolean;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant, isOwner }) => {
  const { user } = useUser();
  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <RestaurantHeader
        name={restaurant.name}
        coverImageUrl={restaurant.cover_image_url}
        imageUrl={restaurant.image_url}
        isOwner={isOwner}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Info Section */}
          <div className="p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
              {isAuthenticated && !isOwner && (
                <FavoriteButton restaurantId={restaurant.id} />
              )}
            </div>

            <RestaurantInfo
              category={restaurant.category}
              address={restaurant.address}
              city={restaurant.city}
              state={restaurant.state}
              phone={restaurant.phone}
              email={restaurant.email}
              openingHours={restaurant.opening_hours as WeekSchedule | null}
              paymentMethods={restaurant.payment_methods as string[] | null}
              socialNetworks={restaurant.social_networks as SocialNetworkLink[] | null}
            />
          </div>

          <Separator />

          {/* Gallery */}
          {restaurant.gallery && restaurant.gallery.length > 0 && (
            <>
              <RestaurantGallery gallery={restaurant.gallery} />
              <Separator />
            </>
          )}

          {/* Menu Section */}
          {restaurant.menu_categories && restaurant.menu_categories.length > 0 && (
            <>
              <MenuSection
                menuCategories={restaurant.menu_categories}
                restaurantId={restaurant.id}
                isOwner={isOwner}
              />
              <Separator />
            </>
          )}

          {/* Canais de Pedido */}
          <OrderChannelsSection
            whatsappUrl={restaurant.whatsapp_url}
            ifoodUrl={restaurant.ifood_url}
            otherUrl={restaurant.other_url}
            externalUrl={restaurant.external_url}
          />

          {/* Footer */}
          <RestaurantFooter
            description={restaurant.description}
            createdAt={restaurant.created_at}
          />
        </div>
      </div>
    </div>
  );
};

export default FreeProfileLayout;