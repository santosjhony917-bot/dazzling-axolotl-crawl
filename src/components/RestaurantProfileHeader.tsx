"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface RestaurantProfileHeaderProps {
  restaurant: {
    cover_image_url?: string;
    name: string;
  };
  isOwner: boolean;
  onEdit: () => void;
}

export const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({ restaurant, isOwner, onEdit }) => {
  return (
    <div className="relative h-64 bg-gray-200 overflow-hidden">
      {restaurant.cover_image_url ? (
        <img
          src={restaurant.cover_image_url}
          alt={`Capa de ${restaurant.name}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 text-xl font-semibold">
          {restaurant.name}
        </div>
      )}
      {isOwner && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-4 right-4 bg-white rounded-full shadow-md"
          onClick={onEdit}
        >
          <Pencil size={20} />
        </Button>
      )}
    </div>
  );
};