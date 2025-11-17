import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoCardItemProps {
  label: string;
  value: string | number | null | undefined;
  isLocked?: boolean;
}

export function InfoCardItem({ label, value, isLocked = false }: InfoCardItemProps) {
  const displayValue = value || "Não definido";
  
  return (
    <div className="flex justify-between items-center py-3 px-4">
      <span className={cn("text-sm font-medium text-gray-500 dark:text-gray-400", isLocked && "opacity-60")}>
        {label}
      </span>
      <div className="flex items-center space-x-2">
        {isLocked && <Lock className="h-4 w-4 text-red-500" />}
        <span className={cn("text-sm text-gray-900 dark:text-gray-100", isLocked && "text-red-500")}>
          {isLocked ? "Exclusivo Premium" : displayValue}
        </span>
      </div>
    </div>
  );
}