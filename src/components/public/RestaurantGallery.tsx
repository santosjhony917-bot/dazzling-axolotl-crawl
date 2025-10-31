import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image } from 'lucide-react';

interface RestaurantGalleryProps {
  restaurantId: string;
}

export const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ restaurantId }) => {
  // Placeholder para a galeria
  const images = [
    // Simulação de dados
    { id: 1, url: 'https://via.placeholder.com/300x200?text=Galeria+1' },
    { id: 2, url: 'https://via.placeholder.com/300x200?text=Galeria+2' },
    { id: 3, url: 'https://via.placeholder.com/300x200?text=Galeria+3' },
  ];

  if (images.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
        <Image className="w-6 h-6 mr-2 text-highlight" />
        Galeria
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {images.map(image => (
          <div key={image.id} className="aspect-video overflow-hidden rounded-lg shadow-md">
            <img src={image.url} alt={`Imagem ${image.id}`} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
          </div>
        ))}
      </div>
    </div>
  );
};