"use client";

import React, { useState, useMemo } from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import RestaurantHeader from './RestaurantHeader';
import RestaurantInfo from './RestaurantInfo';
import RestaurantAddressHoursSection from './RestaurantAddressHoursSection';
import OrderChannelsSection from './OrderChannelsSection';
import RestaurantPaymentSection from './RestaurantPaymentSection';
import RestaurantActionsBar from './RestaurantActionsBar';
import RestaurantGallery from './RestaurantGallery';
import RestaurantMenu from './RestaurantMenu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Utensils, Image, Info } from 'lucide-react';
import useFavoriteToggle from '@/hooks/useFavoriteToggle';

interface PremiumProfileLayoutProps {
  initialRestaurantData: PublicRestaurantData;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ initialRestaurantData }) => {
  const { restaurant, toggleFavorite } = useFavoriteToggle(initialRestaurantData);

  const headerProps = useMemo(() => ({
    name: restaurant.name,
    category: restaurant.category || '',
    coverImageUrl: restaurant.cover_image_url || '',
    addressSummary: restaurant.addressSummary,
    followersCount: restaurant.followers_count,
    isFavorite: restaurant.is_favorite,
    isOpen: restaurant.isOpen,
    statusText: restaurant.statusText,
    isPremium: true,
  }), [restaurant]);

  // Verifica se há conteúdo para as abas
  const hasMenu = restaurant.menu_categories && restaurant.menu_categories.length > 0;
  const hasGallery = restaurant.gallery_images && restaurant.gallery_images.length > 0;

  const defaultTab = hasMenu ? 'menu' : hasGallery ? 'gallery' : 'info';

  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header (Cover Image and Logo) */}
      <RestaurantHeader {...headerProps} />

      {/* Actions Bar (Fixed on scroll) */}
      <RestaurantActionsBar
        isFavorite={restaurant.is_favorite}
        onFavoriteToggle={toggleFavorite}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
      />

      <main className="relative -mt-16 z-10">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-t-xl overflow-hidden">
          {/* Restaurant Info */}
          <RestaurantInfo restaurant={restaurant} isPremium={true} />

          {/* Tabs Navigation (Premium layout includes Info tab explicitly) */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-10">
                <TabsTrigger value="info" className="flex items-center space-x-2">
                  <Info className="w-4 h-4" />
                  <span>Informações</span>
                </TabsTrigger>
                {hasMenu && (
                  <TabsTrigger value="menu" className="flex items-center space-x-2">
                    <Utensils className="w-4 h-4" />
                    <span>Cardápio</span>
                  </TabsTrigger>
                )}
                {hasGallery && (
                  <TabsTrigger value="gallery" className="flex items-center space-x-2">
                    <Image className="w-4 h-4" />
                    <span>Galeria</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>

          {/* Content Sections */}
          <div className="pb-12">
            {/* Info Tab Content */}
            <TabsContent value="info" className="mt-0">
              <div id="info-section">
                {/* Canais de Pedido */}
                <OrderChannelsSection restaurant={restaurant} />

                {/* Endereço e Horário */}
                <RestaurantAddressHoursSection restaurant={restaurant} />

                {/* Pagamento */}
                <RestaurantPaymentSection restaurant={restaurant} />
              </div>
            </TabsContent>

            {/* Gallery Tab Content */}
            {hasGallery && (
              <TabsContent value="gallery" className="mt-0">
                <div id="gallery-section">
                  <RestaurantGallery gallery={restaurant.gallery_images} />
                </div>
              </TabsContent>
            )}

            {/* Menu Tab Content */}
            {hasMenu && (
              <TabsContent value="menu" className="mt-0 p-4">
                <RestaurantMenu 
                  menuCategories={restaurant.menu_categories} 
                  isFullMenuPage={false}
                />
              </TabsContent>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PremiumProfileLayout;