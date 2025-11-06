import React from 'react';
import { cn } from '@/lib/utils';
import RestaurantProfileHeader from './RestaurantProfileHeader';
import RestaurantLogo from './RestaurantLogo';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import PublicMenuSection from './PublicMenuSection';
import RestaurantAddressHoursSection from './RestaurantAddressHoursSection';
import OrderChannelsSection from './OrderChannelsSection';
import RestaurantInfo from './RestaurantInfo';

type RestaurantPlan = 'free' | 'basic' | 'premium' | 'premium_gift';

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  isCompact?: boolean;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isFavorite: boolean;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ 
  restaurant, 
  isCompact = false,
  toggleFavorite,
  isFavoriteMutating,
  isFavorite
}) => {
  const isPremium = restaurant.plan === 'premium' || restaurant.plan === 'premium_gift';

  const logoSizeClass = isCompact ? 'w-20 h-20' : 'w-28 h-28';
  const contentPaddingTop = isCompact ? 'pt-12' : 'pt-16';
  const h1SizeClass = isCompact ? 'text-2xl' : 'text-3xl';

  return (
    <main className="bg-gray-50 min-h-screen pb-20">
      {/* Header Section */}
      <div className="relative">
        <RestaurantProfileHeader 
          restaurant={{
            id: restaurant.id,
            name: restaurant.name,
            coverImageUrl: restaurant.cover_image_url,
            isPremium: isPremium,
            isCompact: isCompact,
          }} 
        />
        <div className="container mx-auto px-4 relative">
          <div className={cn(
            "absolute bottom-0 transform translate-y-1/2"
          )}>
            <RestaurantLogo 
              src={restaurant.image_url}
              alt={restaurant.name}
              plan={restaurant.plan as RestaurantPlan}
              sizeClass={logoSizeClass}
            />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className={cn("container mx-auto px-4", contentPaddingTop)}>
        <div className="flex justify-between items-start">
          <div className="text-left">
            <h1 className={cn("font-extrabold leading-tight text-primary", h1SizeClass, "mb-1")}>
              {restaurant.name}
            </h1>
            <p className="text-sm text-gray-500">{restaurant.category}</p>
          </div>
          <div className="flex-shrink-0 ml-4">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleFavorite}
              disabled={isFavoriteMutating}
              className="rounded-full"
            >
              <Heart className={cn("h-5 w-5", isFavorite && "fill-red-500 text-red-500")} />
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-8">
          <RestaurantInfo id={restaurant.id} restaurant={restaurant} />
          <OrderChannelsSection restaurant={restaurant} />
          <RestaurantAddressHoursSection
            id={restaurant.id}
            restaurant={restaurant}
            fullAddress={restaurant.addressSummary || ''}
            paymentMethods={restaurant.payment_methods}
          />
          <PublicMenuSection
            restaurantId={restaurant.id}
            categories={restaurant.menu_categories.map((category) => ({
              ...category,
              items: category.menu_items,
            }))}
          />
        </div>
      </div>
    </main>
  );
};

export default FreeProfileLayout;