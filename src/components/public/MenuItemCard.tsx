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
        <div className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden shadow-md">
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Detalhes do Item */}
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-start">
          <h4 className="text-base font-semibold text-gray-900 truncate pr-2">{item.name}</h4>
          {isPremium && (
            <button 
              onClick={handleFavoriteToggle}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
              aria-label={`Favoritar ${item.name}`}
            >
              <Heart className={cn("w-4 h-4", item.is_favorite && "fill-red-500 text-red-500")} />
            </button>
          )}
        </div>
        
        {item.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
        )}
        
        <p className="text-base font-bold text-primary mt-1">
          {formatPrice(item.price)}
        </p>
      </div>
    </div>
  );
};

export default MenuItemCard;