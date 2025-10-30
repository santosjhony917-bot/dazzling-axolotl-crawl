import React from 'react';
import { GalleryImage } from '@/types/restaurant';
import { Card } from '@/components/ui/card';

interface RestaurantGalleryProps {
  gallery: GalleryImage[];
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ gallery }) => {
  if (gallery.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#022D68]">Fotos</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {gallery.map((image) => (
          <Card key={image.id} className="overflow-hidden rounded-lg shadow-sm aspect-square">
            <img
              src={image.image_url}
              alt={image.caption || 'Imagem da galeria'}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RestaurantGallery;