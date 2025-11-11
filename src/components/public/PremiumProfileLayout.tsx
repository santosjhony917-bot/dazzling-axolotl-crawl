"use client";

import React, { useMemo, useState } from 'react';
import { PublicRestaurantData, GalleryImage } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Utensils, MapPin, Clock, Heart, Share2, Phone, Mail, Image, Info } from 'lucide-react';
import RestaurantMenu from './RestaurantMenu';
import RestaurantGallery from './RestaurantGallery';
import { Button } from '@/components/ui/button';
import { useAuthData } from '@/context/AuthContext';
import { getRestaurantOpenStatus } from '@/lib/schedule';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import OrderChannelsSection from './OrderChannelsSection';
import DetailedHoursDisplay from './DetailedHoursDisplay';
import RestaurantActionsBar from './RestaurantActionsBar';
import RestaurantProfileHeader from './RestaurantProfileHeader';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import RestaurantAddressHoursSection from './RestaurantAddressHoursSection';
import RestaurantInfo from './RestaurantInfo';
import RestaurantMainInfoCard from './RestaurantMainInfoCard';
import AdditionalInfo from './AdditionalInfo';
import { PublicMenuItem } from '@/types/menu';

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact?: boolean;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant, toggleFavorite, isFavoriteMutating, isCompact = false }) => {
  console.log("PremiumProfileLayout: Renderizando com restaurante:", restaurant.name);

  // Determine restaurant status
  const { isOpen, statusText, nextOpenTime } = useMemo(() => {
    if (!restaurant.opening_hours) {
      return { isOpen: false, statusText: 'Horário não disponível', nextOpenTime: null };
    }
    return getRestaurantOpenStatus(restaurant.opening_hours);
  }, [restaurant.opening_hours]);

  const addressSummary = useMemo(() => {
    if (!restaurant.address && !restaurant.city) return null;
    const parts = [];
    if (restaurant.address) parts.push(restaurant.address);
    if (restaurant.number) parts.push(`, ${restaurant.number}`);
    if (restaurant.neighborhood) parts.push(` - ${restaurant.neighborhood}`);
    if (restaurant.city) parts.push(`, ${restaurant.city}`);
    if (restaurant.state) parts.push(`/${restaurant.state}`);
    return parts.join('');
  }, [restaurant.address, restaurant.number, restaurant.neighborhood, restaurant.city, restaurant.state]);

  return (
    <div className="relative min-h-screen bg-background-light pb-20"> {/* Added pb-20 for bottom spacing */}
      {/* Cover Image and Actions */}
      <RestaurantProfileHeader
        coverImageUrl={restaurant.cover_image_url}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
      />

      <div className="relative z-10 -mt-16 px-4"> {/* Adjust margin-top to overlap cover image */}
        {/* Main Info Card (Logo, Name, Address, Status, Follow Button) */}
        <RestaurantMainInfoCard
          restaurant={{
            id: restaurant.id,
            name: restaurant.name,
            logoUrl: restaurant.image_url, // Assuming image_url is the logo
            addressSummary: addressSummary || '',
            followersCount: restaurant.followers_count,
            isFavorite: restaurant.is_favorite,
            isOpen: isOpen,
            statusText: statusText,
            plan: restaurant.plan,
          }}
          onFavoriteToggle={toggleFavorite}
          isFavoriteMutating={isFavoriteMutating}
          isCompact={isCompact}
        />

        {/* Action Bar (Share, Contact, etc.) */}
        <RestaurantActionsBar
          restaurantId={restaurant.id}
          whatsappUrl={restaurant.whatsapp_url}
          phone={restaurant.phone}
          email={restaurant.email}
          externalUrl={restaurant.external_url}
          otherUrl={restaurant.other_url}
          otherUrlLabel={restaurant.other_url_label}
        />

        {/* Order Channels */}
        {restaurant.ifood_url || restaurant.whatsapp_url || restaurant.other_url ? (
          <section className="mt-6">
            <OrderChannelsSection
              whatsappUrl={restaurant.whatsapp_url}
              ifoodUrl={restaurant.ifood_url}
              otherUrl={restaurant.other_url}
              otherUrlLabel={restaurant.other_url_label}
            />
          </section>
        ) : null}

        {/* Menu Section */}
        {restaurant.menu_categories && restaurant.menu_categories.length > 0 && (
          <section className="mt-6">
            <RestaurantMenu
              menuCategories={restaurant.menu_categories}
              restaurantId={restaurant.id}
              forceShowFullMenuButton={true} // Always show full menu button on premium profile
              isCompact={isCompact}
            />
          </section>
        )}

        {/* Gallery Section */}
        {restaurant.gallery_images && restaurant.gallery_images.length > 0 && (
          <section className="mt-6">
            <RestaurantGallery
              images={restaurant.gallery_images}
              restaurantName={restaurant.name}
            />
          </section>
        )}

        {/* Address and Hours Section */}
        <section className="mt-6">
          <RestaurantAddressHoursSection
            address={addressSummary || ''}
            openingHours={restaurant.opening_hours}
            isOpen={isOpen}
            statusText={statusText}
            nextOpenTime={nextOpenTime}
          />
        </section>

        {/* Additional Info (Description, Payment Methods, Social Networks) */}
        <section className="mt-6">
          <AdditionalInfo
            description={restaurant.description}
            paymentMethods={restaurant.payment_methods}
            socialNetworks={restaurant.social_networks}
          />
        </section>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;