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
  const isPremium = currentPlan === 'premium' || currentPlan === 'premium_gift';

  return (
    <div className="flex w-full p-1 bg-slate-100 rounded-2xl mb-6 shadow-none">
      <Button
        onClick={() => setPreviewPlan('free')}
        size="sm"
        className={cn(
          "flex-1 h-9 rounded-xl font-bold transition-all text-[11px] sm:text-xs px-2 whitespace-nowrap",
          previewPlan === 'free'
            ? "bg-white text-primary shadow-none hover:bg-white"
            : "bg-transparent text-slate-500 hover:bg-gray-200/50"
        )}
        variant="ghost"
      >
        {isFree ? 'Seu Plano (Free)' : 'Perfil Free'}
      </Button>
      <Button
        onClick={() => setPreviewPlan('premium')}
        size="sm"
        className={cn(
          "flex-1 h-9 rounded-xl font-bold transition-all text-[11px] sm:text-xs px-2 whitespace-nowrap",
          previewPlan === 'premium'
            ? "bg-highlight text-white shadow-none hover:bg-highlight/90"
            : "bg-transparent text-slate-500 hover:bg-gray-200/50"
        )}
        variant="ghost"
      >
        {isPremium ? 'Seu Plano (Premium)' : 'Perfil Premium'}
      </Button>
    </div>
  );
};

export default PlanPreviewToggle;