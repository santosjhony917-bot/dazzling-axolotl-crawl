import React from 'react';

interface RestaurantGalleryProps {
  restaurantId: string;
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ restaurantId }) => {
  // TODO: Implementar a lógica para buscar e exibir a galeria de fotos do restaurante
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary mb-2">Galeria de Fotos</h2>
      <div className="p-4 bg-gray-50 rounded-lg text-gray-600 text-center">
        <p>A galeria de fotos do restaurante será exibida aqui.</p>
        <p className="text-sm mt-2">ID do Restaurante: {restaurantId}</p>
      </div>
    </div>
  );
};

export default RestaurantGallery;