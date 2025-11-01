"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface MenuItemCardProps {
  item: {
    item_id: string;
    item_name: string;
    item_description: string | null;
    item_price: number;
    item_image_url: string | null;
    restaurant_name: string;
  };
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  return (
    <Card className="w-[250px] flex-shrink-0 shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-0">
        <div className="relative w-full h-36 rounded-t-lg overflow-hidden">
          {item.item_image_url ? (
            <img
              src={item.item_image_url}
              alt={item.item_name}
              className="w-full h-full object-cover rounded-t-lg"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm rounded-t-lg">
              Sem Imagem
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 truncate">{item.item_name}</h3>
          <p className="text-sm text-gray-600 truncate mb-2">{item.restaurant_name}</p>
          {item.item_description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.item_description}</p>
          )}
          <p className="text-md font-bold text-[#E47948]">
            R$ {item.item_price.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuItemCard;