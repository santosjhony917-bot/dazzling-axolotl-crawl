import React from 'react';
import { cn } from '@/lib/utils';

interface MenuItemCardProps {
  name: string;
  price: number;
  imageUrl?: string;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ name, price, imageUrl }) => {
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);

  return (
    <div className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-none hover:shadow-none transition-shadow cursor-pointer">
      <div className="w-16 h-16 flex-shrink-0 mr-4">
        <img 
          src={imageUrl || 'https://via.placeholder.com/150/f0f0f0?text=Item'} 
          alt={name} 
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-base font-semibold text-gray-900 dark:text-white line-clamp-1">{name}</p>
        <p className="text-sm font-bold text-highlight dark:text-highlight-light mt-0.5">{formattedPrice}</p>
      </div>
    </div>
  );
};

export default MenuItemCard;