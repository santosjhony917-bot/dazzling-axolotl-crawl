import React from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NearbyRestaurantItem {
  id: string;
  name: string;
  cuisine: string;
  distance: number;
  rating: number;
  imageUrl: string;
}

interface NearbyRestaurantCardProps {
  item: NearbyRestaurantItem;
  onClick: (id: string) => void;
}

const NearbyRestaurantCard: React.FC<NearbyRestaurantCardProps> = ({ item, onClick }) => {
  return (
    <div 
      className="flex items-center gap-4 bg-white dark:bg-zinc-800 p-3 rounded-2xl shadow-none cursor-pointer hover:shadow-none transition-shadow"
      onClick={() => onClick(item.id)}
    >
      <div 
        className="w-24 h-24 bg-center bg-no-repeat aspect-square bg-cover rounded-lg flex-shrink-0" 
        data-alt={item.name} 
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
      />
      <div className="flex-1">
        <p className="text-text-light dark:text-text-dark text-base font-bold leading-normal">
          {item.name}
        </p>
        <p className="text-text-light/70 dark:text-text-dark/70 text-sm font-normal leading-normal">
          {item.cuisine} • {item.distance.toFixed(1)} km
        </p>
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-4 h-4 text-accent fill-accent" />
          <p className="text-text-light dark:text-text-dark text-sm font-semibold ml-1">
            {item.rating.toFixed(1)}
          </p>
        </div>
      </div>
      <button className="flex items-center justify-center size-10 rounded-full bg-accent/10 text-accent shrink-0">
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default NearbyRestaurantCard;