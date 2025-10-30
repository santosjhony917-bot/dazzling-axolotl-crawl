"use client";

import React from 'react';
import { Separator } from '@/components/ui/separator';
import { UpdateRestaurantPayload } from '@/types/payloads';

interface LogoSectionProps {
  data: {
    logoUrl: string;
  } | null;
  isOwner: boolean;
  onUpdate: (payload: UpdateRestaurantPayload) => Promise<void>;
}

export function LogoSection({ data, isOwner, onUpdate }: LogoSectionProps) {
  if (!data) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Logo do Restaurante</h3>
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 rounded-full border flex items-center justify-center overflow-hidden bg-gray-100">
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400 text-xs">Logo</span>
          )}
        </div>
        {isOwner && (
          <button className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
            {data.logoUrl ? 'Alterar Logo' : 'Adicionar Logo'}
          </button>
        )}
      </div>
      <Separator className="mt-4" />
    </div>
  );
}