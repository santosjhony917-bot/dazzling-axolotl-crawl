import React from 'react';
import { cn } from '@/lib/utils';

interface HighlightItem {
  id: string;
  name: string;
  restaurantName: string;
  price: number;
  imageUrl: string;
}

interface HighlightCardProps {
  item: HighlightItem;
}

const HighlightCard: React.FC<HighlightCardProps> = ({ item }) => {
  return (
    <div className="flex h-full flex-1 flex-col gap-2 rounded-2xl min-w-[280px] shadow-none bg-white dark:bg-zinc-800 overflow-hidden">
      <div 
        className="w-full bg-center bg-no-repeat aspect-[1.7/1] bg-cover flex flex-col" 
        data-alt={item.name} 
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
      />
      <div className="p-4 flex-1">
        <p className="text-text-light dark:text-text-dark text-lg font-bold leading-tight">
          {item.name}
        </p>
        <p className="text-text-light/70 dark:text-text-dark/70 text-sm font-normal leading-normal mt-1">
          {item.restaurantName}
        </p>
        <p className="text-accent text-lg font-bold leading-tight mt-2">
          R$ {item.price.toFixed(2).replace('.', ',')}
        </p>
      </div>
    </div>
  );
};

export default HighlightCard;