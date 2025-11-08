"use client";

import React from "react";
import { PublicRestaurantData } from "@/types/restaurant";

interface RestaurantSocialsSectionProps {
  restaurant: PublicRestaurantData;
}

const RestaurantSocialsSection: React.FC<RestaurantSocialsSectionProps> = ({ restaurant }) => {
  if (!restaurant.social_networks || restaurant.social_networks.length === 0) {
    return null;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Redes Sociais</h2>
      {/* Lógica para exibir as redes sociais */}
      <p className="text-gray-500">Redes sociais do {restaurant.name} serão exibidas aqui.</p>
    </div>
  );
};

export default RestaurantSocialsSection;