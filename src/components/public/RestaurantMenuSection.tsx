"use client";

import React from "react";
import { PublicRestaurantData } from "@/types/restaurant";

interface RestaurantMenuSectionProps {
  restaurant: PublicRestaurantData;
}

const RestaurantMenuSection: React.FC<RestaurantMenuSectionProps> = ({ restaurant }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Cardápio</h2>
      {/* Lógica para exibir o cardápio */}
      <p className="text-gray-500">Cardápio do {restaurant.name} será exibido aqui.</p>
    </div>
  );
};

export default RestaurantMenuSection;