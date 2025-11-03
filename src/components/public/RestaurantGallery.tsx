import React from 'react';
import { RestaurantGalleryItem } from '@/types/restaurant'; // Corrigido para RestaurantGalleryItem
import { Card } from '@/components/ui/card';

interface RestaurantGalleryProps {
  gallery: RestaurantGalleryItem[];
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ gallery }) => {
  if (!gallery || gallery.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 shadow-soft-md rounded-xl bg-white border border-gray-300">
      <h2 className="text-2xl font-bold text-primary mb-3">Galeria</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {gallery.map((item) => (
          <div key={item.id} className="relative aspect-video overflow-hidden rounded-md">
            <img
              src={item.image_url}
              alt={item.caption || 'Imagem da galeria'}
              className="w-full h-full object-cover"
            />
            {item.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs">
                {item.caption}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RestaurantGallery;