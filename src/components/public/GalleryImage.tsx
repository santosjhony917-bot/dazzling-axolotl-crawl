import React from 'react';
import { RestaurantGalleryImage } from '@/types/restaurant';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface GalleryImageProps {
  image: RestaurantGalleryImage;
}

const GalleryImage: React.FC<GalleryImageProps> = ({ image }) => (
  <div className="relative w-full h-full">
    <img
      src={image.image_url || PLACEHOLDER_IMAGE_URL}
      alt={image.caption || 'Imagem da galeria'}
      className="w-full h-full object-cover"
      loading="lazy"
    />
    {/* Optional: Caption overlay */}
    {image.caption && (
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-xs truncate">
        {image.caption}
      </div>
    )}
  </div>
);

export default GalleryImage;