import React from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface CompetitorItem {
  id: string;
  name: string;
  cuisine: string;
  distance: number;
  rating: number; // Mantido no mock, mas não exibido
  imageUrl: string;
}

interface NearbyCompetitorCardProps {
  item: CompetitorItem;
  onClick: (id: string) => void;
}

const NearbyCompetitorCard: React.FC<NearbyCompetitorCardProps> = ({ item, onClick }) => {
  return (
    <Card 
      className="flex items-center gap-4 bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-soft-md cursor-pointer hover:shadow-soft-lg transition-shadow border-none"
      onClick={() => onClick(item.id)}
    >
      <div 
        className="w-16 h-16 bg-center bg-no-repeat aspect-square bg-cover rounded-xl flex-shrink-0" 
        data-alt={item.name} 
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-primary dark:text-white text-base font-bold leading-normal truncate">
          {item.name}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal truncate">
          {item.cuisine} • {item.distance.toFixed(1)} km
        </p>
        {/* Removendo a exibição de Rating */}
      </div>
      <button className="flex items-center justify-center size-8 rounded-full bg-gray-100 text-primary shrink-0 hover:bg-gray-200 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
    </Card>
  );
};

export default NearbyCompetitorCard;