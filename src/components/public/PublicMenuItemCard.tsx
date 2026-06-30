import { formatMenuPrice } from '@/utils/menuPricing';
import React from 'react';
import { formatPrice } from '@/utils/formatters';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface MenuItem {
  id: string;
  name: string;
  display_name?: string | null;
  description: string | null;
  price: number;
  display_price?: number | null;
  price_min?: number | null;
  price_type?: string | null;
  commercial_type?: string | null;
  is_configurable?: boolean | null;
  image_url: string | null;
  restaurantName: string; // Adicionado para contexto na busca
}

interface PublicMenuItemCardProps {
  item: MenuItem;
  onClick: (itemId: string) => void;
}

const PublicMenuItemCard: React.FC<PublicMenuItemCardProps> = ({ item, onClick }) => {
  const itemDisplayName = item.display_name || item.name;
  return (
    <div 
      className="flex items-center gap-4 bg-white dark:bg-background-dark rounded-2xl p-3 shadow-none cursor-pointer hover:shadow-none transition-shadow"
      onClick={() => onClick(item.id)}
    >
      <div className="aspect-square size-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-50">
        <img
          src={item.image_url || PLACEHOLDER_IMAGE_URL}
          alt={itemDisplayName}
          className="h-full w-full object-contain"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#111418] dark:text-white text-base font-bold leading-normal truncate">{itemDisplayName}</p>
        <p className="text-text-secondary dark:text-gray-400 text-sm font-normal leading-snug line-clamp-2">{item.description || item.restaurantName}</p>
        <p className="text-highlight text-lg font-bold leading-tight mt-1">{formatMenuPrice(item)}</p>
      </div>
    </div>
  );
};

export default PublicMenuItemCard;
