"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types'; // Importar PublicRestaurantData
import RestaurantProfileHeader from '@/components/public/RestaurantProfileHeader';
import RestaurantMainInfoCard from '@/components/public/RestaurantMainInfoCard';
import OrderChannelsSection from '@/components/public/OrderChannelsSection';
import PublicMenuSection from '@/components/public/PublicMenuSection';
import RestaurantAddressHoursSection from '@/components/public/RestaurantAddressHoursSection';
import RestaurantGallerySection from '@/components/public/RestaurantGallerySection';
import AdditionalInfo from '@/components/public/AdditionalInfo';
import { cn } from '@/lib/utils';
import RestaurantPageHeader from '@/components/public/RestaurantPageHeader'; // Importar o cabeçalho de botões

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact: boolean;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({
  restaurant,
  toggleFavorite,
  isFavoriteMutating,
  isCompact,
}) => {
  const headerData = {
    cover_image_url: restaurant.cover_image_url,
    image_url: restaurant.image_url,
    name: restaurant.name,
  };

  const mainInfoCardData = {
    id: restaurant.id,
    image_url: restaurant.image_url,
    name: restaurant.name,
    city: restaurant.city,
    state: restaurant.state,
    followers_count: restaurant.followers_count,
    is_favorite: restaurant.is_favorite,
    plan: restaurant.plan,
    category: restaurant.category,
    description: restaurant.description,
    whatsapp_url: restaurant.whatsapp_url,
    ifood_url: restaurant.ifood_url,
    other_url: restaurant.other_url,
    other_url_label: restaurant.other_url_label,
    opening_hours: restaurant.opening_hours,
  };

  const fullAddress = `${restaurant.address || ''}, ${restaurant.number || ''} - ${restaurant.neighborhood || ''}, ${restaurant.city || ''} - ${restaurant.state || ''}, ${restaurant.cep || ''}`;

  const containerPxClass = isCompact ? "px-4" : "px-4"; // Manter px-4 para ambos os estados

  return (
    <div className="relative">
      {/* 1. Capa do Restaurante (RestaurantProfileHeader) */}
      <RestaurantProfileHeader restaurant={headerData} />
      
      {/* 2. Cabeçalho de botões (Voltar/Compartilhar) posicionado absolutamente sobre a capa */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <RestaurantPageHeader />
      </div>

      {/* 3. Card de Informações Principais (com logo sobreposta) */}
      <RestaurantMainInfoCard
        restaurant={mainInfoCardData}
        onFavoriteToggle={toggleFavorite}
        isFavoriteMutating={isFavoriteMutating}
        isCompact={isCompact}
      />

      <div className={cn("pb-8", containerPxClass)}>
        {/* Conteúdo Principal */}
        <div className="mt-4 space-y-6">
          {/* Description */}
          {restaurant.description && (
            <section id="description-section">
              <h2 className="text-xl font-bold mb-2">Sobre</h2>
              <p className="text-gray-700">{restaurant.description}</p>
            </section>
          )}

          {/* Order Channels */}
          <OrderChannelsSection restaurant={restaurant} />

          {/* Gallery */}
          <RestaurantGallerySection id="gallery-section" restaurantId={restaurant.id} plan={restaurant.plan} />

          {/* Menu */}
          <PublicMenuSection restaurantId={restaurant.id} categories={restaurant.menu_categories} />

          {/* Address and Hours */}
          <RestaurantAddressHoursSection id="address-hours-section" restaurant={restaurant} fullAddress={fullAddress} paymentMethods={restaurant.payment_methods} />

          {/* Additional Info */}
          <AdditionalInfo restaurant={restaurant} />
        </div>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;