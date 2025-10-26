import React from 'react';
import PublicRestaurantLayout from '@/components/PublicRestaurantLayout';

/**
 * Esta página é o ponto de entrada para a visualização pública de um restaurante.
 * O componente PublicRestaurantLayout é responsável por buscar os dados
 * e renderizar o layout apropriado (Free ou Premium).
 */
export default function RestaurantProfilePublic() {
  return <PublicRestaurantLayout />;
}