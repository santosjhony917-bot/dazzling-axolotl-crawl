"use client";

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface PlanPreviewToggleProps {
  showPremiumPreview: boolean;
  onToggle: () => void;
}

const PlanPreviewToggle: React.FC<PlanPreviewToggleProps> = ({ showPremiumPreview, onToggle }) => {
  return (
    <div className="flex items-center justify-center space-x-2 mt-8">
      <Label htmlFor="plan-preview-toggle" className="text-lg text-gray-700 dark:text-gray-300">
        Visualizar Planos Premium
      </Label>
      <Switch
        id="plan-preview-toggle"
        checked={showPremiumPreview}
        onCheckedChange={onToggle}
      />
    </div>
  );
};

export default PlanPreviewToggle;