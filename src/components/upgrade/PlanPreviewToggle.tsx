import React from 'react';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

interface PlanPreviewToggleProps {
  activePlan: 'free' | 'premium';
  handleToggle: (plan: 'free' | 'premium') => void;
}

const PlanPreviewToggle: React.FC<PlanPreviewToggleProps> = ({ activePlan, handleToggle }) => {
  const isFreeActive = activePlan === 'free';
  const isPremiumActive = activePlan === 'premium';

  return (
    <div className="relative p-1 bg-gray-200 dark:bg-gray-700 rounded-full flex w-full max-w-sm mx-auto shadow-inner">
      
      {/* Indicador de Fundo Ativo */}
      <div
        className={cn(
          "absolute top-1 bottom-1 w-1/2 bg-white dark:bg-gray-800 rounded-full shadow-md transition-transform duration-500",
          isPremiumActive ? 'translate-x-full' : 'translate-x-0'
        )}
      />

      {/* Botão "Versão Gratuita" */}
      <button
        onClick={() => handleToggle('free')}
        className={cn(
          "relative z-10 flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-colors duration-500",
          isFreeActive ? 'text-primary dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-primary/80 dark:hover:text-white/80'
        )}
      >
        Versão Gratuita
      </button>

      {/* Botão "Versão Premium" */}
      <button
        onClick={() => handleToggle('premium')}
        className={cn(
          "relative z-10 flex-1 py-2.5 px-4 rounded-full text-sm font-semibold transition-colors duration-500 flex items-center justify-center gap-1",
          isPremiumActive ? 'text-primary dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-primary/80 dark:hover:text-white/80'
        )}
      >
        <Crown className={cn("w-4 h-4 transition-colors", isPremiumActive ? 'text-highlight fill-highlight' : 'text-gray-500')} />
        Versão Premium
      </button>
    </div>
  );
};

export default PlanPreviewToggle;