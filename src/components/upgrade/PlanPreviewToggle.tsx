import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RestaurantPlan } from '@/types/supabase';

interface PlanPreviewToggleProps {
  currentPlan: RestaurantPlan;
  previewPlan: 'free' | 'premium';
  setPreviewPlan: (plan: 'free' | 'premium') => void;
}

const PlanPreviewToggle: React.FC<PlanPreviewToggleProps> = ({ currentPlan, previewPlan, setPreviewPlan }) => {
  const isFree = currentPlan === 'free';
  const isPremium = currentPlan === 'premium';

  return (
    <div className="flex w-full p-1 bg-gray-100 rounded-xl mb-6 shadow-inner">
      <Button
        onClick={() => setPreviewPlan('free')}
        className={cn(
          "flex-1 h-10 rounded-lg font-semibold transition-all",
          previewPlan === 'free'
            ? "bg-white text-primary shadow-soft-md hover:bg-white"
            : "bg-transparent text-gray-600 hover:bg-gray-200/50"
        )}
        variant="ghost"
      >
        {isFree ? 'Seu Plano (Free)' : 'Visualização Free'}
      </Button>
      <Button
        onClick={() => setPreviewPlan('premium')}
        className={cn(
          "flex-1 h-10 rounded-lg font-semibold transition-all",
          previewPlan === 'premium'
            ? "bg-highlight text-white shadow-highlight-glow hover:bg-highlight/90"
            : "bg-transparent text-gray-600 hover:bg-gray-200/50"
        )}
        variant="ghost"
      >
        {isPremium ? 'Seu Plano (Premium)' : 'Visualização Premium'}
      </Button>
    </div>
  );
};

export default PlanPreviewToggle;