import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RestaurantPlan } from '@/types/supabase';

interface PlanPreviewToggleProps {
  currentPlan: RestaurantPlan;
  previewPlan: RestaurantPlan;
  setPreviewPlan: (plan: RestaurantPlan) => void;
}

const PlanPreviewToggle: React.FC<PlanPreviewToggleProps> = ({ currentPlan, previewPlan, setPreviewPlan }) => {
  // ... (restante do arquivo)