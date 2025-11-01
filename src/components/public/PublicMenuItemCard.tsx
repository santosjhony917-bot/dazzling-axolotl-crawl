import React from 'react';
import { formatPrice } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  restaurantName: string; // Adicionado para contexto na busca
}

interface PublicMenuItemCardProps {
  item: MenuItem;
  onClick: (itemId: string) => void;
}

const PublicMenuItemCard: React.FC<PublicMenuItemCardProps> = ({ item, onClick }) => {
  return (
    <div 
      className="flex items-center gap-4 bg-white dark:bg-background-dark rounded-xl p-3 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onClick(item.id)}
    >
      <div 
        className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-20 flex-shrink-0" 
        style={{ backgroundImage: `url("${item.image_url || PLACEHOLDER_IMAGE_URL}")` }}
        data-alt={item.name}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[#111418] dark:text-white text-base font-bold leading-normal truncate">{item.name}</p>
        <p className="text-[#5f728c] dark:text-gray-400 text-sm font-normal leading-snug line-clamp-2">{item.description || item.restaurantName}</p>
        <p className="text-highlight text-lg font-bold leading-tight mt-1">{formatPrice(item.price)}</p>
      </div>
    </div>
  );
};

export default PublicMenuItemCard;