"use client";

import React from 'react';
import { MapPin, Clock, Phone, Mail, Globe, ExternalLink, MessageSquare, UtensilsCrossed } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import PhotoGalleryDisplay from '@/components/PhotoGalleryDisplay';
import RestaurantMenu from '@/components/public/RestaurantMenu';
import OrderChannelsSection from '@/components/public/OrderChannelsSection';
import { MenuCategoryWithItems } from '@/types/supabase';
import { formatOpeningHours } from '@/utils/formatters';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  menuCategories: MenuCategoryWithItems[];
  galleryImages: GalleryImage[];
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant, menuCategories, galleryImages }) => {
  const fullAddress = [restaurant.address, restaurant.number, restaurant.neighborhood, restaurant.city, restaurant.state, restaurant.cep]
    .filter(Boolean)
    .join(', ');

  const hasAddressHours = fullAddress || restaurant.opening_hours;
  const hasContactLinks = restaurant.phone || restaurant.email || restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url || restaurant.external_url;

  return (
    <div className="container mx-auto p-4">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 bg-gray-200 rounded-lg overflow-hidden shadow-md mb-6">
        <img
          src={restaurant.cover_image_url || PLACEHOLDER_IMAGE_URL}
          alt={`Capa de ${restaurant.name}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 text-white">
          <h1 className="text-3xl font-bold">{restaurant.name}</h1>
          {restaurant.category && <p className="text-lg">{restaurant.category}</p>}
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        {restaurant.description && (
          <p className="text-gray-700 mb-4">{restaurant.description}</p>
        )}

        {(hasAddressHours || hasContactLinks) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {hasAddressHours && (
              <div className="space-y-2">
                {fullAddress && (
                  <div className="flex items-start text-gray-600">
                    <MapPin className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>{fullAddress}</span>
                  </div>
                )}
                {restaurant.opening_hours && (
                  <div className="flex items-start text-gray-600">
                    <Clock className="h-5 w-5 mr-2 flex-shrink-0" />
                    <div dangerouslySetInnerHTML={{ __html: formatOpeningHours(restaurant.opening_hours) }} />
                  </div>
                )}
              </div>
            )}

            {hasContactLinks && (
              <div className="space-y-2">
                {restaurant.phone && (
                  <a href={`tel:${restaurant.phone}`} className="flex items-center text-blue-600 hover:underline">
                    <Phone className="h-5 w-5 mr-2" />
                    {restaurant.phone}
                  </a>
                )}
                {restaurant.email && (
                  <a href={`mailto:${restaurant.email}`} className="flex items-center text-blue-600 hover:underline">
                    <Mail className="h-5 w-5 mr-2" />
                    {restaurant.email}
                  </a>
                )}
                {restaurant.whatsapp_url && (
                  <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-green-600 hover:underline">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    WhatsApp
                  </a>
                )}
                {restaurant.ifood_url && (
                  <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-red-600 hover:underline">
                    <UtensilsCrossed className="h-5 w-5 mr-2" />
                    iFood
                  </a>
                )}
                {restaurant.other_url && (
                  <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-gray-600 hover:underline">
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Outro Link
                  </a>
                )}
                {restaurant.external_url && (
                  <a href={restaurant.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-purple-600 hover:underline">
                    <Globe className="h-5 w-5 mr-2" />
                    Site Externo
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Channels */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold text-[#022D68] mb-4">Canais de Pedido</h2>
        <OrderChannelsSection restaurant={restaurant} />
      </div>

      {/* Menu Section */}
      {menuCategories.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-2xl font-bold text-[#022D68] mb-4">Nosso Cardápio</h2>
          <RestaurantMenu menuCategories={menuCategories} />
        </div>
      )}

      {/* Gallery Section */}
      {galleryImages.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-2xl font-bold text-[#022D68] mb-4">Galeria</h2>
          <PhotoGalleryDisplay images={galleryImages} />
        </div>
      )}
    </div>
  );
};

export default FreeProfileLayout;