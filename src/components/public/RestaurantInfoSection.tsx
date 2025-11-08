"use client";

import React from "react";
import { PublicRestaurantData } from "@/types/restaurant";

interface RestaurantInfoSectionProps {
  restaurant: PublicRestaurantData;
}

const RestaurantInfoSection: React.FC<RestaurantInfoSectionProps> = ({ restaurant }) => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-2">{restaurant.name}</h2>
      {restaurant.description && <p className="text-gray-600">{restaurant.description}</p>}
      {/* Adicione mais informações do restaurante aqui */}
    </div>
  );
};

export default RestaurantInfoSection;