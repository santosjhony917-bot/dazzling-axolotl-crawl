import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type SearchType = 'dishes' | 'restaurants';

interface SearchToggleProps {
  activeType: SearchType;
  onToggle: (type: SearchType) => void;
}

const SearchToggle: React.FC<SearchToggleProps> = ({ activeType, onToggle }) => {
  const isDishesActive = activeType === 'dishes';
  const isRestaurantsActive = activeType === 'restaurants';

  const ActiveButton = ({ children, isActive, type }: { children: React.ReactNode, isActive: boolean, type: SearchType }) => (
    <motion.div 
      className="flex-1 relative"
      whileTap={{ scale: isActive ? 1 : 0.98 }}
    >
      <Button
        onClick={() => onToggle(type)}
        className={cn(
          "w-full h-11 rounded-xl text-base font-semibold transition-all duration-300 relative z-10",
          isActive
            ? "bg-highlight text-white shadow-soft-md hover:bg-highlight/90"
            : "bg-transparent text-gray-600 hover:bg-gray-200/50 hover:text-primary"
        )}
        variant={isActive ? 'highlight' : 'ghost'}
      >
        {children}
      </Button>
      {/* Sombra sutil sob o botão ativo */}
      {isActive && (
        <motion.div
          layoutId="active-tab-indicator"
          className="absolute inset-0 rounded-xl shadow-soft-lg pointer-events-none"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </motion.div>
  );

  return (
    <div className="flex w-full p-1 bg-gray-100 rounded-2xl mb-6 shadow-inner">
      <ActiveButton isActive={isDishesActive} type="dishes">
        Pratos
      </ActiveButton>
      <ActiveButton isActive={isRestaurantsActive} type="restaurants">
        Restaurantes
      </ActiveButton>
    </div>
  );
};

export default SearchToggle;