"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Utensils, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/createPageUrl";

const PLACEHOLDER_IMAGE_URL = "https://via.placeholder.com/150";

interface RestaurantCardProps {
  restaurant: {
    id: string;
    name: string;
    image_url?: string;
    category?: string;
    city?: string;
  };
  onRemoveFavorite?: (restaurantId: string) => void;
}

export function RestaurantCard({ restaurant, onRemoveFavorite }: RestaurantCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="flex overflow-hidden cursor-pointer hover:shadow-soft-lg transition-shadow relative border-none shadow-soft-md rounded-xl"
      onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
    >
      <img
        src={restaurant.image_url || PLACEHOLDER_IMAGE_URL}
        alt={restaurant.name}
        className="w-24 h-28 object-cover flex-shrink-0"
      />
      <div className="p-3 flex-1 min-w-0">
        <h3 className="font-bold text-lg truncate text-[#022D68] leading-tight">{restaurant.name}</h3>
        {restaurant.category && (
          <p className="text-sm text-gray-600 flex items-center mt-1">
            <Utensils className="w-4 h-4 mr-1 text-gray-500" />
            {restaurant.category}
          </p>
        )}
        {restaurant.city && (
          <p className="text-sm text-gray-600 flex items-center mt-1">
            <MapPin className="w-4 h-4 mr-1 text-gray-500" />
            {restaurant.city}
          </p>
        )}
      </div>
      {onRemoveFavorite && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveFavorite(restaurant.id);
          }}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      )}
    </Card>
  );
}