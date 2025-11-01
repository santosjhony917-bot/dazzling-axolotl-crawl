import React from 'react';
import { RestaurantGalleryItem } from '@/types/restaurant';

interface RestaurantGalleryProps {
  gallery: RestaurantGalleryItem[];
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ gallery }) => {
  if (gallery.length === 0) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6">
      <h3 className="text-lg font-semibold mb-3">Galeria</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {gallery.map((item) => (
          <div key={item.id} className="aspect-square overflow-hidden rounded-lg shadow-sm">
            <img
              src={item.image_url}
              alt={item.caption || 'Imagem da galeria'}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RestaurantGallery;