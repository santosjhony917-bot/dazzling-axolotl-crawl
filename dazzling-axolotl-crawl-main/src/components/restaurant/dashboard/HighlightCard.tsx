import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface HighlightItem {
  id: string;
  name: string;
  restaurantName: string;
  price: number;
  imageUrl: string;
}

interface HighlightCardProps {
  item: HighlightItem;
  className?: string;
}

const HighlightCard: React.FC<HighlightCardProps> = ({ item, className }) => {
  const formattedPrice = `R$ ${item.price.toFixed(2).replace('.', ',')}`;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex h-full flex-col gap-0 rounded-xl min-w-[200px] shadow-soft-lg bg-white dark:bg-zinc-800 overflow-hidden border-none transition-transform duration-300",
        className
      )}
    >
      <div 
        className="w-full bg-center bg-no-repeat aspect-[1.4/1] bg-cover flex flex-col rounded-t-xl relative" // Aumentado o aspect ratio
        data-alt={item.name} 
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
      >
        {/* Leve brilho de iluminação no topo */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 opacity-50" />
      </div>
      <CardContent className="p-3 flex-1">
        <p className="text-primary dark:text-white text-base font-extrabold leading-tight">
          {item.name}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-xs font-normal leading-normal mt-0.5">
          {item.restaurantName}
        </p>
        <p className="text-highlight text-lg font-extrabold leading-tight mt-1">
          {formattedPrice}
        </p>
      </CardContent>
    </motion.div>
  );
};

export default HighlightCard;