"use client";

import React from 'react';
import { MenuItem } from '@/types/supabase'; // Assuming MenuItem type is available
import { cn } from '@/lib/utils';
import { Heart } from 'lucide-react';
import { useMenuItemFavorites } from '@/hooks/useMenuItemFavorites';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface MenuItemCardProps {
  item: MenuItem;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  const { isFavorite, toggleFavorite } = useMenuItemFavorites(item.id);

  return (
    <div className="flex items-center bg-white rounded-lg shadow-sm p-4">
      <img
        src={item.image_url || PLACEHOLDER_IMAGE_URL}
        alt={item.name}
        className="w-24 h-24 object-cover rounded-md mr-4"
      />
      <div className="flex-grow">
        <h4 className="font-semibold text-lg text-[#022D68]">{item.name}</h4>
        {item.description && <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>}
        <p className="text-md font-bold text-[#E47948] mt-1">R$ {item.price.toFixed(2)}</p>
      </div>
      <button onClick={toggleFavorite} className="ml-4 p-2 rounded-full hover:bg-gray-100">
        <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
      </button>
    </div>
  );
};

export default MenuItemCard;