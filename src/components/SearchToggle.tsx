import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type SearchType = 'dishes' | 'restaurants';

interface SearchToggleProps {
  activeType: SearchType;
  onToggle: (type: SearchType) => void;
}

// Create a motion-compatible version of the Button component
const MotionButton = motion(Button);

const SearchToggle: React.FC<SearchToggleProps> = ({ activeType, onToggle }) => {
  const isDishesActive = activeType === 'dishes';
  const isRestaurantsActive = activeType === 'restaurants';

  return (
    <div className="relative flex w-full p-1 bg-gray-100 rounded-2xl mb-6 shadow-inner">
      {/* Active indicator */}
      <motion.div
        layoutId="active-tab-indicator"
        className={cn(
          "absolute top-1 bottom-1 rounded-xl shadow-soft-lg bg-highlight pointer-events-none",
          isDishesActive ? "left-1 right-[50%]" : "left-[50%] right-1"
        )}
        initial={false}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />

      <MotionButton
        onClick={() => onToggle('dishes')}
        className={cn(
          "flex-1 h-11 rounded-xl text-base font-semibold transition-all duration-300 relative z-10",
          isDishesActive
            ? "text-white"
            : "bg-transparent text-gray-600 hover:bg-gray-200/50 hover:text-primary"
        )}
        variant={isDishesActive ? 'highlight' : 'ghost'}
        whileTap={{ scale: isDishesActive ? 1 : 0.98 }}
      >
        Pratos
      </MotionButton>

      <MotionButton
        onClick={() => onToggle('restaurants')}
        className={cn(
          "flex-1 h-11 rounded-xl text-base font-semibold transition-all duration-300 relative z-10",
          isRestaurantsActive
            ? "text-white"
            : "bg-transparent text-gray-600 hover:bg-gray-200/50 hover:text-primary"
        )}
        variant={isRestaurantsActive ? 'highlight' : 'ghost'}
        whileTap={{ scale: isRestaurantsActive ? 1 : 0.98 }}
      >
        Restaurantes
      </MotionButton>
    </div>
  );
};

export default SearchToggle;