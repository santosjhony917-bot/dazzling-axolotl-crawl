import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Store } from 'lucide-react';

type SearchType = 'dishes' | 'restaurants';

interface SearchToggleProps {
  activeType: SearchType;
  onToggle: (type: SearchType) => void;
}

const SearchToggle: React.FC<SearchToggleProps> = ({ activeType, onToggle }) => {
  const isDishesActive = activeType === 'dishes';

  return (
    <div className="relative flex w-full bg-[#F1F3F5] rounded-[18px] p-1 mb-5 h-[52px]">
      {/* Pill deslizante */}
      <motion.div
        className="absolute top-1 bottom-1 bg-white rounded-[14px] shadow-[0_2px_10px_rgba(0,0,0,0.10)]"
        animate={{ left: isDishesActive ? '4px' : 'calc(50% + 0px)', width: 'calc(50% - 4px)' }}
        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
      />

      {/* Botão Pratos */}
      <button
        onClick={() => onToggle('dishes')}
        className={cn(
          'relative z-10 flex-1 flex items-center justify-center gap-2 text-[15px] font-semibold transition-colors duration-200 focus:outline-none rounded-[14px]',
          isDishesActive ? 'text-[#EF2A39]' : 'text-[#9CA3AF]'
        )}
      >
        <Utensils className="w-4 h-4" />
        Pratos
      </button>

      {/* Botão Restaurantes */}
      <button
        onClick={() => onToggle('restaurants')}
        className={cn(
          'relative z-10 flex-1 flex items-center justify-center gap-2 text-[15px] font-semibold transition-colors duration-200 focus:outline-none rounded-[14px]',
          !isDishesActive ? 'text-[#EF2A39]' : 'text-[#9CA3AF]'
        )}
      >
        <Store className="w-4 h-4" />
        Restaurantes
      </button>
    </div>
  );
};

export default SearchToggle;