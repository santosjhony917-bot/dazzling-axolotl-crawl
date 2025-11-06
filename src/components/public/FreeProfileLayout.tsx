"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types'; // Importando o tipo PublicRestaurantData
import RestaurantInfo from './RestaurantInfo';
import { RestaurantActionsBar } from './RestaurantActionsBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import RestaurantProfileHeader from './RestaurantProfileHeader'; // Importar o header também para o layout free

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  onBack: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  isFavorite: boolean;
  isCompact?: boolean; // Adicionado
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({
  restaurant,
  onBack,
  onToggleFavorite,
  onShare,
  isFavorite,
  isCompact, // Adicionado
}) => {
  return (
    <div className="relative min-h-screen bg-gray-50">
      <RestaurantActionsBar
        onBack={onBack}
        onToggleFavorite={onToggleFavorite}
        onShare={onShare}
        isFavorite={isFavorite}
        isCompact={isCompact} // Passando para RestaurantActionsBar
      />
      {/* O layout Free também pode ter um header, mesmo que mais simples */}
      <RestaurantProfileHeader restaurant={restaurant} isCompact={isCompact} /> {/* Passando isCompact */}
      <ScrollArea className="h-[calc(100vh-60px)]">
        <div className="relative z-0 px-4 pb-4 -mt-16">
          <RestaurantInfo restaurant={restaurant} />
          {/* Outras seções do layout free */}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FreeProfileLayout;