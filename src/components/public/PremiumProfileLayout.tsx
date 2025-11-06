"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import RestaurantActionsBar from '@/components/public/RestaurantActionsBar';
import RestaurantHeader from '@/components/public/RestaurantHeader';
import RestaurantMenu from '@/components/public/RestaurantMenu';
import RestaurantGallery from '@/components/public/RestaurantGallery';
import RestaurantInfo from '@/components/public/RestaurantInfo';
import RestaurantOrderOptions from '@/components/public/RestaurantOrderOptions';
import { Separator } from '@/components/ui/separator';

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact?: boolean;
  onBack: () => void;
  onShare: () => void;
  isFavorite: boolean;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({
  restaurant,
  toggleFavorite,
  isFavoriteMutating,
  isCompact,
  onBack,
  onShare,
  isFavorite,
}) => {
  return (
    <div className="relative min-h-screen bg-background-light pb-16">
      {/* Actions Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 max-w-md mx-auto px-4">
        <RestaurantActionsBar
          isFavorite={isFavorite}
          onFavoriteToggle={toggleFavorite}
          isFavoriteMutating={isFavoriteMutating}
          onShare={onShare}
          onBack={onBack}
        />
      </div>

      <RestaurantHeader restaurant={restaurant} />

      <div className="relative z-0 bg-background-light rounded-t-3xl -mt-8 p-4 shadow-lg">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-primary mb-2">{restaurant.name}</h1>
          <p className="text-muted-foreground mb-4">{restaurant.description}</p>

          <RestaurantOrderOptions restaurant={restaurant} />

          <Separator className="my-6" />

          <RestaurantGallery restaurantId={restaurant.id} />

          <Separator className="my-6" />

          <RestaurantMenu restaurantId={restaurant.id} menuCategories={restaurant.menu_categories || []} />

          <Separator className="my-6" />

          <RestaurantInfo restaurant={restaurant} />
        </div>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;