"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Button } from '@/components/ui/button';
import { FaWhatsapp, FaExternalLinkAlt } from 'react-icons/fa';
import { SiIfood } from 'react-icons/si';
import { cn } from '@/lib/utils';

interface RestaurantOrderOptionsProps {
  restaurant: PublicRestaurantData;
}

const RestaurantOrderOptions: React.FC<RestaurantOrderOptionsProps> = ({ restaurant }) => {
  return (
    <div className="flex justify-around gap-4 py-4">
      {restaurant.whatsapp_url && (
        <Button asChild variant="outline" className="flex-1 h-auto py-3 flex-col items-center justify-center text-center">
          <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center">
            <FaWhatsapp className="h-6 w-6 text-green-500 mb-1" />
            <span className="text-xs font-medium text-gray-700">WhatsApp</span>
          </a>
        </Button>
      )}
      {restaurant.ifood_url && (
        <Button asChild variant="outline" className="flex-1 h-auto py-3 flex-col items-center justify-center text-center">
          <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center">
            <SiIfood className="h-6 w-6 text-red-500 mb-1" />
            <span className="text-xs font-medium text-gray-700">iFood</span>
          </a>
        </Button>
      )}
      {restaurant.other_url && (
        <Button asChild variant="outline" className="flex-1 h-auto py-3 flex-col items-center justify-center text-center">
          <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center">
            <FaExternalLinkAlt className="h-6 w-6 text-blue-500 mb-1" />
            <span className="text-xs font-medium text-gray-700">{restaurant.other_url_label || 'Outro Link'}</span>
          </a>
        </Button>
      )}
    </div>
  );
};

export default RestaurantOrderOptions;