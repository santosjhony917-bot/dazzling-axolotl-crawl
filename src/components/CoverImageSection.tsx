"use client";

import React from 'react';
import { UpdateRestaurantPayload } from '@/types/payloads';

interface CoverImageSectionProps {
  data: {
    coverImageUrl: string;
  } | null;
  isOwner: boolean;
  onUpdate: (payload: UpdateRestaurantPayload) => Promise<void>;
}

export function CoverImageSection({ data, isOwner, onUpdate }: CoverImageSectionProps) {
  if (!data) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Imagem de Capa</h3>
      <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border">
        {data.coverImageUrl ? (
          <img src={data.coverImageUrl} alt="Capa" className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Nenhuma imagem de capa
          </div>
        )}
        {isOwner && (
          <button className="absolute bottom-2 right-2 bg-white/80 text-sm px-3 py-1 rounded-md shadow hover:bg-white transition-colors">
            {data.coverImageUrl ? 'Alterar Capa' : 'Adicionar Capa'}
          </button>
        )}
      </div>
    </div>
  );
}