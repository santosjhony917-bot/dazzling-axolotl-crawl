"use client";

import React from 'react';
import { GalleryImage } from '@/types/restaurant'; // Importando GalleryImage
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RestaurantGalleryProps {
  gallery: GalleryImage[]; // Usando o novo tipo
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ gallery }) => {
  if (!gallery || gallery.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-primary">Galeria</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {gallery.map((image) => (
          <Card key={image.id} className="overflow-hidden rounded-lg shadow-soft-md border border-gray-300">
            <img
              src={image.image_url}
              alt={image.caption || 'Imagem da galeria'}
              className="w-full h-32 sm:h-40 object-cover"
            />
            {image.caption && (
              <p className="p-2 text-sm text-gray-700 truncate">{image.caption}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RestaurantGallery;