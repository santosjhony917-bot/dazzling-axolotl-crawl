import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { MapPin, Clock, MessageSquare, Utensils, Globe, Heart, Share2 } from 'lucide-react';
import RestaurantMenu from './RestaurantMenu';
import RestaurantGallery from './RestaurantGallery';
import OrderChannelButton from './OrderChannelButton';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { formatOpeningHours } from '@/utils/formatters';
import FavoriteButton from './FavoriteButton';

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  isOwner: boolean;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant, isOwner }) => {
  const {
    name,
    description,
    addressSummary,
    phone,
    email,
    whatsapp_url,
    ifood_url,
    other_url,
    opening_hours,
    menu_categories,
    gallery_images,
    id: restaurantId,
    is_favorite,
    followers_count,
  } = restaurant;

  const formattedHours = formatOpeningHours(opening_hours);

  // Determine which order channels are available
  const orderChannels = [
    { type: 'whatsapp', url: whatsapp_url },
    { type: 'ifood', url: ifood_url },
    { type: 'other', url: other_url },
  ].filter(channel => channel.url);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-[#022D68] mb-2">{name}</h1>
        <p className="text-gray-600 mb-4">{description}</p>
        
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <MapPin className="w-4 h-4 mr-2 text-red-500" />
          <span>{addressSummary}</span>
        </div>

        {formattedHours && (
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <Clock className="w-4 h-4 mr-2 text-blue-500" />
            <span>{formattedHours}</span>
          </div>
        )}

        {/* Actions and Stats */}
        <div className="flex justify-between items-center border-t pt-4">
          <div className="flex items-center space-x-4">
            <FavoriteButton 
              restaurantId={restaurantId} 
              initialIsFavorite={is_favorite} 
              initialFollowersCount={followers_count} 
            />
            <Button variant="outline" size="sm" className="flex items-center">
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </Button>
          </div>
          {isOwner && (
            <Button variant="secondary" size="sm">
              Editar Perfil
            </Button>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Order Channels Section (New Look) */}
      {orderChannels.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#022D68] mb-4">Faça seu pedido</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {orderChannels.map((channel) => (
              <OrderChannelButton 
                key={channel.type}
                type={channel.type as 'whatsapp' | 'ifood' | 'other'}
                url={channel.url!}
              />
            ))}
          </div>
        </div>
      )}

      {/* Gallery Section */}
      {gallery_images && gallery_images.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#022D68] mb-4">Fotos</h2>
          {/* CORREÇÃO 3: Passando a prop 'images' corretamente */}
          <RestaurantGallery images={gallery_images} />
        </div>
      )}

      {/* Menu Section */}
      {menu_categories && menu_categories.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#022D68] mb-4">Cardápio</h2>
          {/* CORREÇÃO 4: Passando as props obrigatórias para RestaurantMenu */}
          <RestaurantMenu 
            menuCategories={menu_categories} 
            restaurantId={restaurantId}
            isPremium={true} // Assumindo que este layout é Premium
            id={restaurantId} // ID do restaurante
          />
        </div>
      )}
    </div>
  );
};

export default PremiumProfileLayout;