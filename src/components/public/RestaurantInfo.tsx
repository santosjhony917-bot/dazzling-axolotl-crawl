"use client";

import { PublicRestaurantData } from "@/types/restaurant";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface RestaurantInfoProps {
  restaurant: PublicRestaurantData;
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ restaurant }) => {
  if (!restaurant.description) {
    return null;
  }

  return (
    <section className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">
        Sobre {restaurant.name}
      </h2>
      <p className="text-gray-600 whitespace-pre-wrap">{restaurant.description}</p>
    </section>
  );
};

export default RestaurantInfo;