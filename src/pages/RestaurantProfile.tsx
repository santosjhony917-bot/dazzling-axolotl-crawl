import React from 'react';
import { useParams } from 'react-router-dom';
import { Utensils } from 'lucide-react';

const RestaurantProfile: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();

  return (
    <div className="p-4 max-w-md mx-auto text-center">
      <Utensils className="w-12 h-12 text-highlight mx-auto mt-10 mb-4" />
      <h1 className="text-2xl font-bold text-[#022D68] mb-2">Perfil do Restaurante</h1>
      <p className="text-gray-600">Visualizando o perfil do restaurante ID: {restaurantId}</p>
    </div>
  );
};

export default RestaurantProfile;