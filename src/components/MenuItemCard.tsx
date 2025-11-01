import React from 'react';
import { MenuItemWithFavorites } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItemCardProps {
  item: MenuItemWithFavorites;
  isOwner: boolean;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, isOwner }) => {
  const priceFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(item.price);

  return (
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-lg", !item.is_active && "opacity-60")}>
      <CardContent className="p-4 flex space-x-4">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="text-lg font-semibold text-gray-900 truncate">
              {item.name}
            </h4>
            {!isOwner && (
              <Heart
                className={cn(
                  "w-5 h-5 flex-shrink-0 ml-2",
                  item.is_favorite ? "text-red-500 fill-red-500" : "text-gray-300 fill-none"
                )}
              />
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
          <p className="text-lg font-bold text-primary mt-2">{priceFormatted}</p>
          {isOwner && !item.is_active && (
            <p className="text-sm text-red-500 mt-1">Item Inativo</p>
          )}
        </div>
        
        {item.image_url && (
          <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MenuItemCard;