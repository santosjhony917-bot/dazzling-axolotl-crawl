import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

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
  const formattedPrice = `R$ ${item.price.toFixed(2).replace('.', ',')}`;
  
  return (
    <Card className="flex h-full flex-col gap-0 rounded-xl min-w-[200px] shadow-md bg-white dark:bg-zinc-800 overflow-hidden border-none">
      <div 
        className="w-full bg-center bg-no-repeat aspect-[1.2/1] bg-cover flex flex-col rounded-t-xl" 
        data-alt={item.name} 
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
      />
      <CardContent className="p-3 flex-1">
        <p className="text-[#022D68] dark:text-white text-base font-bold leading-tight">
          {item.name}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal mt-0.5">
          {item.restaurantName}
        </p>
        <p className="text-highlight text-lg font-bold leading-tight mt-1">
          {formattedPrice}
        </p>
      </CardContent>
    </Card>
  );
};

export default HighlightCard;