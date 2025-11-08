import React from 'react';

interface RestaurantCoverImageProps {
  coverImageUrl: string | null;
  altText?: string;
}

const RestaurantCoverImage: React.FC<RestaurantCoverImageProps> = ({ coverImageUrl }) => {
  const defaultCover = "https://via.placeholder.com/800x300?text=Capa+do+Restaurante";
  const imageUrl = coverImageUrl || defaultCover;

  return (
    <div className="h-48 w-full overflow-hidden bg-gray-200 dark:bg-gray-800">
      <img 
        src={imageUrl} 
        alt="Imagem de Capa do Restaurante" 
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default RestaurantCoverImage;