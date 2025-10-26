import React from 'react';
import { formatPrice } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { Utensils, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchItem {
  id: string;
  name: string;
  description: string | null;
  price?: number; // Apenas para pratos
  imageUrl: string | null;
  type: 'dish' | 'restaurant';
  // Campos adicionais para restaurante
  category?: string | null;
  city?: string | null;
}

interface SearchItemCardProps {
  item: SearchItem;
  onClick: (itemId: string, type: 'dish' | 'restaurant') => void;
}

const SearchItemCard: React.FC<SearchItemCardProps> = ({ item, onClick }) => {
  const isDish = item.type === 'dish';
  const formattedPrice = item.price ? formatPrice(item.price) : null;
  const displayDescription = isDish ? item.description : item.category;

  return (
    <div 
      className="flex items-center gap-4 bg-white dark:bg-background-dark rounded-xl p-3 shadow-soft-md cursor-pointer hover:shadow-soft-lg transition-shadow border border-gray-100"
      onClick={() => onClick(item.id, item.type)}
    >
      <div 
        className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-20 flex-shrink-0" 
        style={{ backgroundImage: `url("${item.imageUrl || PLACEHOLDER_IMAGE_URL}")` }}
        data-alt={item.name}
      />
      <div className="flex-1 min-w-0">
        <p className="text-primary dark:text-white text-base font-bold leading-normal truncate">{item.name}</p>
        
        {isDish && formattedPrice && (
          <p className="text-highlight text-lg font-bold leading-tight mt-1">{formattedPrice}</p>
        )}
        
        {displayDescription && (
          <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-snug line-clamp-2 mt-0.5">
            {displayDescription}
          </p>
        )}
        
        {!isDish && item.city && (
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-highlight" /> {item.city}
          </p>
        )}
      </div>
    </div>
  );
};

export default SearchItemCard;