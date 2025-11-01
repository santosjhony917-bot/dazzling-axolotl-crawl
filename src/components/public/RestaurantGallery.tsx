"use client";

import React from 'react';
import { GalleryImage } from '@/types/restaurant';
import { Card } from '@/components/ui/card';

interface RestaurantGalleryProps {
  gallery: GalleryImage[] | null;
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ gallery }) => {
  if (!gallery || gallery.length === 0) {
    return <p className="text-center text-gray-500 p-8">Nenhuma imagem na galeria disponível.</p>;
  }

  // Sort by order_index
  const sortedGallery = [...gallery].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
      {sortedGallery.map((image) => (
        <Card key={image.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="aspect-square w-full">
            <img
              src={image.image_url}
              alt={image.caption || 'Imagem da galeria'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          {image.caption && (
            <div className="p-2 bg-white">
              <p className="text-xs text-gray-600 line-clamp-1">{image.caption}</p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default RestaurantGallery;