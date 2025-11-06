"use client";

import React from 'react';

interface RestaurantGalleryProps {
  restaurantId: string; // Apenas para satisfazer o tipo, a lógica de fetch virá depois
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ restaurantId }) => {
  // Lógica para buscar e exibir imagens da galeria virá aqui
  return (
    <div className="py-4">
      <h2 className="text-xl font-bold text-primary mb-4">Fotos</h2>
      <div className="grid grid-cols-2 gap-4">
        {/* Placeholder para imagens da galeria */}
        <div className="bg-gray-100 h-32 rounded-lg flex items-center justify-center text-gray-400">
          Imagem 1
        </div>
        <div className="bg-gray-100 h-32 rounded-lg flex items-center justify-center text-gray-400">
          Imagem 2
        </div>
        <div className="bg-gray-100 h-32 rounded-lg flex items-center justify-center text-gray-400">
          Imagem 3
        </div>
        <div className="bg-gray-100 h-32 rounded-lg flex items-center justify-center text-gray-400">
          Imagem 4
        </div>
      </div>
    </div>
  );
};

export default RestaurantGallery;