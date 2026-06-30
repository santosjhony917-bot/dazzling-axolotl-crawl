import { formatMenuPrice } from '@/utils/menuPricing';
import React from 'react';
import { PublicMenuItem } from '@/types/menu';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/utils/formatters';
import { Heart } from 'lucide-react';

interface MenuItemCardProps {
  item: PublicMenuItem;
  isPremium: boolean;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, isPremium }) => {
  const itemDisplayName = item.display_name || item.name;
  // TODO: Implementar lógica de favoritar item se necessário
  const handleFavoriteToggle = () => {
    console.log(`Toggle favorite for item: ${item.name}`);
  };

  return (
    <div className={cn(
      "flex gap-4 p-3 rounded-lg transition-all",
      isPremium ? "hover:bg-gray-50 cursor-pointer" : "bg-white"
    )}>
      
      {/* Imagem do Item (se existir) */}
      {item.image_url && (
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-50 shadow-none">
          <img
            src={item.image_url}
            alt={itemDisplayName}
            className="h-full w-full object-contain"
          />
          {item.is_illustrative && (
            <div className="absolute top-1 right-1 text-white text-[7px] font-extrabold select-none tracking-wider uppercase drop-shadow-[0_1.2px_2px_rgba(0,0,0,0.85)]">
              Ilustrativa
            </div>
          )}
        </div>
      )}

      {/* Detalhes do Item */}
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-start">
          <h4 className="text-base font-semibold text-gray-900 truncate pr-2">{itemDisplayName}</h4>
          {isPremium && (
            <button 
              onClick={handleFavoriteToggle}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
              aria-label={`Favoritar ${itemDisplayName}`}
            >
              <Heart className={cn("w-4 h-4", item.is_favorite && "fill-red-500 text-red-500")} />
            </button>
          )}
        </div>
        
        {item.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
        )}
        
        <p className="text-base font-bold text-primary mt-1">
          {formatMenuPrice(item)}
        </p>
      </div>
    </div>
  );
};

export default MenuItemCard;
