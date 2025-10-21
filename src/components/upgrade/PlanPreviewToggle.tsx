import React from 'react';
import { cn } from '@/lib/utils';
import { RestaurantPlan } from '@/types/restaurant';

interface PlanPreviewToggleProps {
  previewPlan: RestaurantPlan;
  setPreviewPlan: (plan: RestaurantPlan) => void;
}

const PlanPreviewToggle: React.FC<PlanPreviewToggleProps> = ({ previewPlan, setPreviewPlan }) => {
  const currentSlide = previewPlan === 'free' ? 0 : 1;

  const handleToggle = (plan: RestaurantPlan) => {
    setPreviewPlan(plan);
    // Note: scrollToSlide logic is handled externally or is purely visual here.
  };

  return (
    <div className="relative flex mb-4 p-1.5 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full shadow-inner w-full max-w-sm mx-auto">
      {/* Indicador Deslizante (fundo que se move) */}
      <div 
        className={cn(
          "absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full transition-all duration-500 ease-out shadow-lg",
          currentSlide === 0 
            ? 'left-1.5 bg-white' 
            : 'left-[calc(50%+1.5px)] bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600'
        )}
      />
      
      {/* Botão "Versão Free" */}
      <button
        onClick={() => handleToggle('free')}
        className={cn(
          "relative z-10 flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all duration-500",
          currentSlide === 0
            ? 'text-[#022D68]'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        Versão Free
      </button>
      
      {/* Botão "Versão Premium" */}
      <button
        onClick={() => handleToggle('premium')}
        className={cn(
          "relative z-10 flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-all duration-500",
          currentSlide === 1
            ? 'text-white'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        Versão Premium
      </button>
    </div>
  );
};

export default PlanPreviewToggle;