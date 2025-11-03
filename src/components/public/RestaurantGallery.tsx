"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GalleryImage } from '@/types/restaurant';
import { cn } from '@/lib/utils';

interface RestaurantGalleryProps {
  gallery: GalleryImage[];
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ gallery }) => {
  if (!gallery || gallery.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm border border-gray-200 rounded-lg p-0"> {/* Estilo de card mais simples */}
      <CardHeader className="p-4 border-b border-gray-100">
        <CardTitle className="text-xl font-bold text-gray-800">Galeria de Fotos</CardTitle> {/* Tipografia mais genérica */}
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
        {gallery.map((image) => (
          <div key={image.id} className="relative w-full aspect-square rounded-md overflow-hidden bg-gray-100 shadow-sm"> {/* Sombra mais sutil */}
            <img
              src={image.image_url}
              alt={image.caption || "Imagem da galeria"}
              className="w-full h-full object-cover"
            />
            {image.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs">
                {image.caption}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RestaurantGallery;