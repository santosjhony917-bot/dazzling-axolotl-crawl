import React from 'react';
import { Restaurant } from '@/types/supabase';
import { MapPin, Phone, Share2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProfileHeaderProps {
  restaurant: Restaurant;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ restaurant }) => {
  const address = [restaurant.address, restaurant.number, restaurant.neighborhood, restaurant.city, restaurant.state]
    .filter(Boolean)
    .join(', ');

  return (
    <header className="relative h-64 md:h-80 overflow-hidden">
      {/* Cover Image */}
      <img
        src={restaurant.cover_image_url || 'https://via.placeholder.com/800x400?text=Capa+do+Restaurante'}
        alt={`Capa de ${restaurant.name}`}
        className="w-full h-full object-cover"
      />
      
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <h1 className="text-3xl font-extrabold mb-1">{restaurant.name}</h1>
        
        {address && (
          <div className="flex items-center text-sm text-gray-200 mb-2">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{address}</span>
          </div>
        )}
        
        <div className="flex space-x-3 mt-3">
          <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm">
            <Heart className="w-4 h-4 mr-1" /> Favoritar
          </Button>
          <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm">
            <Share2 className="w-4 h-4 mr-1" /> Compartilhar
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ProfileHeader;