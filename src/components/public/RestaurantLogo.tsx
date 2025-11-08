"use client";

import React from 'react';
import { cn } from '@/lib/utils'; // Assumindo que cn utility existe

interface RestaurantLogoProps {
  imageUrl?: string;
  className?: string;
}

const RestaurantLogo: React.FC<RestaurantLogoProps> = ({ imageUrl, className }) => {
  return (
    <div className={cn("relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg", className)}>
      {imageUrl ? (
        <img src={imageUrl} alt="Logo do Restaurante" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-bold">
          LOGO
        </div>
      )}
    </div>
  );
};

export default RestaurantLogo;