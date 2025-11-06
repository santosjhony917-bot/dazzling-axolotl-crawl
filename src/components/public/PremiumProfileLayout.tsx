"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types'; // Importando o tipo PublicRestaurantData
import DetailedHoursDisplay from './DetailedHoursDisplay';
import { RestaurantActionsBar } from './RestaurantActionsBar';
import RestaurantProfileHeader from './RestaurantProfileHeader';

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  onBack: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  isFavorite: boolean;
  isCompact?: boolean; // Adicionado
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({
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
      <RestaurantProfileHeader restaurant={restaurant} isCompact={isCompact} /> {/* Passando isCompact */}
      <div className="relative z-0 px-4 pb-4 -mt-16">
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-xl font-semibold mb-2">Horário de Funcionamento</h2>
          <DetailedHoursDisplay openingHours={restaurant.opening_hours} />
        </div>
        {/* Outras seções do layout premium */}
      </div>
    </div>
  );
};

export default PremiumProfileLayout;