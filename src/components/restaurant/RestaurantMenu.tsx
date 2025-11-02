import React from 'react';

interface RestaurantMenuProps {
  restaurantId: string;
}

const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ restaurantId }) => {
  // TODO: Implementar a lógica para buscar e exibir o menu do restaurante
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary mb-2">Cardápio</h2>
      <div className="p-4 bg-gray-50 rounded-lg text-gray-600 text-center">
        <p>O cardápio do restaurante será exibido aqui.</p>
        <p className="text-sm mt-2">ID do Restaurante: {restaurantId}</p>
      </div>
    </div>
  );
};

export default RestaurantMenu;