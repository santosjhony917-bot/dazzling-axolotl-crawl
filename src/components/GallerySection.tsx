"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image, Plus } from 'lucide-react';

interface GallerySectionProps {
  restaurantId: string;
  isOwner: boolean;
}

export function GallerySection({ restaurantId, isOwner }: GallerySectionProps) {
  // Placeholder implementation
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Image className="w-5 h-5 text-primary" />
          <span>Galeria de Fotos</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center p-8 border border-dashed rounded-lg text-gray-500">
          {isOwner ? (
            <button className="flex items-center justify-center mx-auto text-primary hover:text-primary/80 transition-colors">
              <Plus className="w-5 h-5 mr-2" />
              Adicionar Imagens
            </button>
          ) : (
            "Nenhuma imagem na galeria."
          )}
        </div>
      </CardContent>
    </Card>
  );
}