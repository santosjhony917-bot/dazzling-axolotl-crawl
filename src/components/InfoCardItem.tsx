"use client";

import { cn } from '@/lib/utils';
import { LucideIcon, Pencil } from 'lucide-react';
import React from 'react';

interface InfoCardItemProps {
  label: string;
  value: string | null | undefined;
  icon: LucideIcon;
  onClick: () => void;
  editIcon?: LucideIcon;
}

export function InfoCardItem({
  label,
  value,
  icon: Icon,
  onClick,
  editIcon: EditIcon = Pencil,
}: InfoCardItemProps) {
  return (
    <div
      className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        {/* Icon rendering block */}
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-blue-800" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-primary leading-snug">
            {label}
          </p>
          <p className={cn("text-sm text-text-secondary mt-0.5", !value && "italic text-gray-400 font-normal")}>
            {value || 'Não definido'}
          </p>
        </div>
      </div>
      {EditIcon && (
        <div className="text-orange-500 hover:text-orange-600 transition-colors shrink-0">
          <EditIcon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}