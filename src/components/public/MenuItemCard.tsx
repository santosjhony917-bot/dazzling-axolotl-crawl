import React from 'react';
import { PublicMenuItem } from '@/types/menu';
import { cn, formatCurrency } from '@/lib/utils'; // Alterado de formatPrice para formatCurrency
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MenuItemCardProps {
  item: PublicMenuItem;
  restaurantId: string;
  isFavorite?: boolean;
  onToggleFavorite?: (itemId: string) => void;
  isFavoriteMutating?: boolean;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  restaurantId,
  isFavorite = false,
  onToggleFavorite,
  isFavoriteMutating = false,
}) => {
  return (
    <div className="relative bg-white rounded-lg shadow-sm overflow-hidden">
      <Link to={`/restaurants/${restaurantId}/menu/${item.id}`}>
        <img
          src={item.image_url || '/placeholder-food.jpg'}
          alt={item.name}
          className="w-full h-40 object-cover"
        />
        <div className="p-4">
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">{item.name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.description}</p>
          <p className="font-bold text-orange-600 text-lg mt-2">{formatCurrency(item.price)}</p>
        </div>
      </Link>
      {onToggleFavorite && (
        <button
          className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md"
          onClick={() => onToggleFavorite(item.id)}
          disabled={isFavoriteMutating}
        >
          <Heart className={cn("h-5 w-5", isFavorite ? "fill-red-500 text-red-500" : "text-gray-400")} />
        </button>
      )}
    </div>
  );
};

export default MenuItemCard;