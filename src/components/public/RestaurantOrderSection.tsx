"use client";

import React from "react";
import { PublicRestaurantData } from "@/types";

interface RestaurantOrderSectionProps {
  restaurant: PublicRestaurantData;
}

const RestaurantOrderSection: React.FC<RestaurantOrderSectionProps> = ({ restaurant }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Faça seu Pedido</h2>
      {/* Lógica para exibir opções de pedido */}
      <p className="text-gray-500">Opções de pedido para {restaurant.name} serão exibidas aqui.</p>
    </div>
  );
};

export default RestaurantOrderSection;