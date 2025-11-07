"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface GalleryImage {
  id: string;
  image_url: string;
  caption?: string;
  order_index: number;
}

interface RestaurantGalleryProps {
  images: GalleryImage[];
  restaurantId: string;
  isOwner: boolean;
  onOpen: () => void; // Placeholder for opening a gallery management modal
}

export const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ images, restaurantId, isOwner, onOpen }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image) => (
          <div key={image.id} className="relative aspect-video rounded-lg overflow-hidden shadow-sm">
            <img src={image.image_url} alt={image.caption || "Imagem da galeria"} className="w-full h-full object-cover" />
            {image.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs">
                {image.caption}
              </div>
            )}
          </div>
        ))}
        {isOwner && (
          <Button
            variant="outline"
            className="aspect-video flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 border-dashed border-2"
            onClick={onOpen}
          >
            <PlusCircle size={24} />
            <span>Adicionar Imagem</span>
          </Button>
        )}
      </div>
      {isOwner && (
        <div className="flex justify-end">
          <Button onClick={onOpen}>Gerenciar Galeria</Button>
        </div>
      )}
    </div>
  );
};