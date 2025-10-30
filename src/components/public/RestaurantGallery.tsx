import React from 'react';
import { GalleryImage } from '@/types/restaurant';
import { Card } from '@/components/ui/card';

interface RestaurantGalleryProps {
  images: GalleryImage[];
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ images }) => {
  if (images.length === 0) {
    return <p className="text-gray-500">Nenhuma foto na galeria.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((image) => (
        <Card key={image.id} className="overflow-hidden aspect-square">
          <img 
            src={image.image_url} 
            alt={image.caption || 'Imagem do restaurante'} 
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </Card>
      ))}
    </div>
  );
};

export default RestaurantGallery;