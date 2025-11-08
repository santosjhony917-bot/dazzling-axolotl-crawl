"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building } from "lucide-react";

export function RestaurantHeader({ restaurant }) {
  if (!restaurant) return null;

  return (
    <div className="relative h-48 bg-gray-200 mb-16">
      {restaurant.cover_image_url ? (
        <img
          src={restaurant.cover_image_url}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-300" />
      )}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 border-4 border-background bg-background">
            <AvatarImage src={restaurant.image_url} alt={restaurant.name} />
            <AvatarFallback>
              <Building className="h-12 w-12 text-gray-400" />
            </AvatarFallback>
          </Avatar>
          <div className="mt-2">
            <h1 className="text-2xl font-bold">{restaurant.name}</h1>
            <p className="text-sm text-muted-foreground">{restaurant.category}</p>
          </div>
        </div>
      </div>
    </div>
  );
}