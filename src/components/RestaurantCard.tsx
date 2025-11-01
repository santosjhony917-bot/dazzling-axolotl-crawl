"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin } from 'lucide-react';
import { RestaurantWithDistance } from '@/types/supabase'; // Importando o tipo correto
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface RestaurantCardProps {
  restaurant: RestaurantWithDistance;
  onClick?: () => void;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onClick }) => {
  return (
    <Link to={`/restaurant/${restaurant.id}`} className="block" onClick={onClick}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <img
          src={restaurant.image_url || PLACEHOLDER_IMAGE_URL}
          alt={restaurant.name}
          className="w-full h-40 object-cover"
        />
        <div className="p-4">
          <h3 className="font-bold text-lg text-[#022D68] truncate">{restaurant.name}</h3>
          {restaurant.category && (
            <p className="text-sm text-gray-600 mb-2">{restaurant.category}</p>
          )}
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{restaurant.city}, {restaurant.state}</span>
            {restaurant.distance_km !== undefined && (
              <span className="ml-2 text-xs text-gray-400">({restaurant.distance_km.toFixed(1)} km)</span>
            )}
          </div>
          <div className="flex items-center text-sm text-yellow-500">
            <Star className="h-4 w-4 mr-1 fill-yellow-500" />
            <span>4.5 (120)</span> {/* Placeholder for rating */}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default RestaurantCard;