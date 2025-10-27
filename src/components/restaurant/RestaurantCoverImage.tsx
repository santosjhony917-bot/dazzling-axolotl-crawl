import React from 'react';
import { PLACEHOLDER_COVER_URL } from '@/constants/assets';

interface RestaurantCoverImageProps {
  coverImageUrl: string | null;
}

const RestaurantCoverImage: React.FC<RestaurantCoverImageProps> = ({ coverImageUrl }) => {
  return (
    <div className="w-full h-48 overflow-hidden bg-gray-200 dark:bg-gray-700">
      <img
        src={coverImageUrl || PLACEHOLDER_COVER_URL}
        alt="Imagem de capa do restaurante"
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default RestaurantCoverImage;