import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';

interface RestaurantHeaderProps {
  restaurant: PublicRestaurantData;
}

const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({ restaurant }) => {
  return (
    <div className="relative h-64 w-full overflow-hidden">
      {/* Cover Image */}
      <img
        src={restaurant.cover_image_url || '/placeholder-cover.jpg'}
        alt={`Capa de ${restaurant.name}`}
        className="w-full h-full object-cover"
      />
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 bg-black opacity-20"></div>
    </div>
  );
};

export default RestaurantHeader;