"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types'; // Importando o tipo PublicRestaurantData
import RestaurantInfo from './RestaurantInfo';
import { RestaurantActionsBar } from './RestaurantActionsBar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData; // Agora espera PublicRestaurantData
  onBack: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  isFavorite: boolean;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({
  restaurant,
  onBack,
  onToggleFavorite,
  onShare,
  isFavorite,
}) => {
  return (
    <div className="relative min-h-screen bg-gray-50">
      <RestaurantActionsBar
        onBack={onBack}
        onToggleFavorite={onToggleFavorite}
        onShare={onShare}
        isFavorite={isFavorite}
      />
      <ScrollArea className="h-[calc(100vh-60px)]">
        <div className="relative z-0 px-4 pb-4 -mt-16">
          <RestaurantInfo restaurant={restaurant} /> {/* Passando PublicRestaurantData */}
          {/* Outras seções do layout free */}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FreeProfileLayout;