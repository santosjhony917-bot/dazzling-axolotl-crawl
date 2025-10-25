import React from 'react';
import { Restaurant } from '@/types/supabase';
import RestaurantPublicHeader from '@/components/restaurant/RestaurantPublicHeader';
import RestaurantGallery from '@/components/restaurant/RestaurantGallery';
import RestaurantMenu from '@/components/restaurant/RestaurantMenu';
import RestaurantSocialLinks from '@/components/restaurant/RestaurantSocialLinks';
import { useRestaurantFavorites } from '@/hooks/useRestaurantFavorites';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface PremiumProfileLayoutProps {
  restaurant: Restaurant;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant }) => {
  const { followersCount, isFavorite, handleToggleFavorite } = useRestaurantFavorites(restaurant.id);

  return (
    <div className="relative min-h-screen">
      {/* Cover Image */}
      <div className="h-64 md:h-80 bg-gray-200 dark:bg-gray-700 overflow-hidden">
        {restaurant.cover_image_url ? (
          <img
            src={restaurant.cover_image_url}
            alt={`Capa de ${restaurant.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-xl font-semibold">
            Sem Imagem de Capa
          </div>
        )}
      </div>

      {/* Header (RestaurantPublicHeader) */}
      <div className="absolute -bottom-16 left-0 right-0 z-10 bg-white dark:bg-gray-800 rounded-t-3xl shadow-xl pt-4">
        <RestaurantPublicHeader 
          restaurant={restaurant} 
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
          followersCount={followersCount}
        />
      </div>

      {/* Content Area */}
      <div className="pt-20 pb-16 px-4 md:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        
        {/* 1. Galeria de Fotos */}
        <section id="gallery" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Galeria de Fotos</h2>
          <RestaurantGallery restaurantId={restaurant.id} />
        </section>

        <Separator className="my-8" />

        {/* 2. Cardápio */}
        <section id="menu" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Cardápio</h2>
          <RestaurantMenu restaurantId={restaurant.id} />
        </section>

        <Separator className="my-8" />

        {/* 3. Canais de Venda */}
        <section id="social-links" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Canais de Venda</h2>
          <RestaurantSocialLinks restaurant={restaurant} />
        </section>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;