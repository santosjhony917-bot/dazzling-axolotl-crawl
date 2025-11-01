"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';

interface RestaurantCardProps {
  restaurant: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    category: string | null;
    city: string | null;
    state: string | null;
    distance_km: number | null;
  };
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  return (
    <Link to={`/restaurant/${restaurant.id}`} className="block">
      <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardContent className="p-0">
          <div className="relative w-full h-40 rounded-t-lg overflow-hidden">
            {restaurant.image_url ? (
              <img
                src={restaurant.image_url}
                alt={restaurant.name}
                className="w-full h-full object-cover rounded-t-lg"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm rounded-t-lg">
                Sem Imagem
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 truncate">{restaurant.name}</h3>
            {restaurant.category && (
              <p className="text-sm text-gray-600 mb-1">{restaurant.category}</p>
            )}
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <MapPin size={16} className="mr-1" />
              <span>{restaurant.city}, {restaurant.state}</span>
              {restaurant.distance_km && (
                <span className="ml-auto">{restaurant.distance_km.toFixed(1)} km</span>
              )}
            </div>
            <div className="flex items-center text-sm text-yellow-500">
              <Star size={16} className="mr-1 fill-yellow-500" />
              <span>4.5 (120)</span> {/* Placeholder for rating */}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default RestaurantCard;