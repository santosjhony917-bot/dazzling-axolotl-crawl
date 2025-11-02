"use client";

import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RestaurantPlan } from '@/types/supabase'; // Assumindo que RestaurantPlan está definido aqui

interface PlanPreviewToggleProps {
  currentPlan: RestaurantPlan;
  previewPlan: 'free' | 'premium';
  setPreviewPlan: (plan: 'free' | 'premium') => void;
}

const PlanPreviewToggle: React.FC<PlanPreviewToggleProps> = ({ currentPlan, previewPlan, setPreviewPlan }) => {
  return (
    <div className="flex justify-center mb-6">
      <ToggleGroup
        type="single"
        value={previewPlan}
        onValueChange={(value: 'free' | 'premium') => {
          if (value) setPreviewPlan(value);
        }}
        className="bg-gray-100 rounded-full p-1"
      >
        <ToggleGroupItem
          value="free"
          aria-label="Visualizar como Free"
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            previewPlan === 'free' ? 'bg-primary text-white shadow-md' : 'text-gray-700 hover:bg-gray-200'
          }`}
        >
          Visualização Free
        </ToggleGroupItem>
        <ToggleGroupItem
          value="premium"
          aria-label="Visualizar como Premium"
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            previewPlan === 'premium' ? 'bg-primary text-white shadow-md' : 'text-gray-700 hover:bg-gray-200'
          }`}
        >
          Visualização Premium
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default PlanPreviewToggle;