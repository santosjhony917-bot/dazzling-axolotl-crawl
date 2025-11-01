"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RestaurantPlan } from '@/types/supabase'; // Importando o tipo correto

interface PlanPreviewToggleProps {
  currentPlan: RestaurantPlan;
  onToggle: (plan: RestaurantPlan) => void;
}

const PlanPreviewToggle: React.FC<PlanPreviewToggleProps> = ({ currentPlan, onToggle }) => {
  return (
    <div className="flex space-x-2 p-1 bg-gray-100 rounded-md">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex-1",
          currentPlan === 'free' && "bg-white shadow-sm text-[#E47948]"
        )}
        onClick={() => onToggle('free')}
      >
        Plano Grátis
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex-1",
          currentPlan === 'basic' && "bg-white shadow-sm text-[#E47948]"
        )}
        onClick={() => onToggle('basic')}
      >
        Plano Básico
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex-1",
          currentPlan === 'premium' && "bg-white shadow-sm text-[#E47948]"
        )}
        onClick={() => onToggle('premium')}
      >
        Plano Premium
      </Button>
    </div>
  );
};

export default PlanPreviewToggle;