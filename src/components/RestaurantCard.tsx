"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin } from 'lucide-react';
import { Restaurant } from '@/types/supabase'; // Assuming Restaurant type is defined here

interface RestaurantCardProps {
  restaurant: Restaurant;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  return (
    <Link to={`/restaurant/${restaurant.id}`} className="block">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <img
          src={restaurant.image_url || 'https://via.placeholder.com/300'}
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