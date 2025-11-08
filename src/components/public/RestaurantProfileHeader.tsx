"use client";

import React from "react";
import { PublicRestaurantData } from "@/types/restaurant";
import { cn } from "@/lib/utils";

interface RestaurantProfileHeaderProps {
  restaurant: PublicRestaurantData;
  isCompact: boolean; // Adicionado
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({ restaurant, isCompact }) => {
  return (
    <div className={cn("relative w-full", isCompact ? "h-48" : "h-64")}>
      {restaurant.cover_image_url && (
        <img
          src={restaurant.cover_image_url}
          alt={`Capa de ${restaurant.name}`}
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
      <div className="absolute bottom-4 left-4 text-white">
        <h1 className="text-3xl font-bold">{restaurant.name}</h1>
        {/* Outras informações podem ser adicionadas aqui */}
      </div>
    </div>
  );
};

export default RestaurantProfileHeader;