import React from 'react';
import { useParams } from 'react-router-dom';

export default function RestaurantProfile() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Perfil do Restaurante {restaurantId}</h1>
      <p>Esta é a página de perfil do restaurante.</p>
    </div>
  );
}