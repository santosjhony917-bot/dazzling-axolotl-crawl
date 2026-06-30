import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Utensils, Store } from 'lucide-react';

type SearchType = 'dishes' | 'restaurants';

interface SearchToggleProps {
  activeType: SearchType;
  onToggle: (type: SearchType) => void;
}

const SearchToggle: React.FC<SearchToggleProps> = ({ activeType, onToggle }) => {
  const isDishesActive = activeType === 'dishes';

  return (
    <div className="relative mb-5 flex h-11 w-full rounded-[18px] border border-slate-100 bg-slate-50 p-1">
      <motion.div
        className="absolute bottom-1 top-1 rounded-[14px] bg-white shadow-sm"
        animate={{ left: isDishesActive ? '4px' : 'calc(50% + 0px)', width: 'calc(50% - 4px)' }}
        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
      />

      <button
        onClick={() => onToggle('dishes')}
        className={cn(
          'relative z-10 flex flex-1 items-center justify-center gap-2 rounded-[14px] text-sm font-semibold transition-colors duration-200 focus:outline-none',
          isDishesActive ? 'text-highlight' : 'text-text-secondary'
        )}
      >
        <Utensils className="h-4 w-4" />
        Pratos
      </button>

      <button
        onClick={() => onToggle('restaurants')}
        className={cn(
          'relative z-10 flex flex-1 items-center justify-center gap-2 rounded-[14px] text-sm font-semibold transition-colors duration-200 focus:outline-none',
          !isDishesActive ? 'text-highlight' : 'text-text-secondary'
        )}
      >
        <Store className="h-4 w-4" />
        Restaurantes
      </button>
    </div>
  );
};

export default SearchToggle;
