import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SearchType = 'dishes' | 'restaurants';

interface SearchToggleProps {
  activeType: SearchType;
  onToggle: (type: SearchType) => void;
}

const SearchToggle: React.FC<SearchToggleProps> = ({ activeType, onToggle }) => {
  const isDishesActive = activeType === 'dishes';
  const isRestaurantsActive = activeType === 'restaurants';

  return (
    <div className="flex w-full p-1 bg-gray-200 rounded-xl mb-6 shadow-inner">
      <Button
        onClick={() => onToggle('dishes')}
        className={cn(
          "flex-1 h-10 rounded-xl text-base font-semibold transition-all duration-200",
          isDishesActive
            ? "bg-highlight text-white shadow-soft-md hover:bg-highlight/90"
            : "bg-transparent text-gray-600 hover:bg-transparent hover:text-primary"
        )}
        variant={isDishesActive ? 'highlight' : 'ghost'}
      >
        Pratos
      </Button>
      <Button
        onClick={() => onToggle('restaurants')}
        className={cn(
          "flex-1 h-10 rounded-xl text-base font-semibold transition-all duration-200",
          isRestaurantsActive
            ? "bg-highlight text-white shadow-soft-md hover:bg-highlight/90"
            : "bg-transparent text-gray-600 hover:bg-transparent hover:text-primary"
        )}
        variant={isRestaurantsActive ? 'highlight' : 'ghost'}
      >
        Restaurantes
      </Button>
    </div>
  );
};

export default SearchToggle;