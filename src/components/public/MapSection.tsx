import React from 'react';
import { PublicRestaurantData } from '@/pages/RestaurantProfilePublic';

interface MapSectionProps {
  restaurant: PublicRestaurantData;
  isPremium: boolean;
}

const MapSection: React.FC<MapSectionProps> = ({ restaurant }) => {
  if (!restaurant.latitude || !restaurant.longitude) {
    return null; // Não renderiza se não houver coordenadas
  }
  return (
    <section className="py-6">
      <h2 className="text-2xl font-bold mb-4">Localização</h2>
      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
        {/* Placeholder para um componente de mapa real */}
        Mapa da localização de {restaurant.name} ({restaurant.latitude}, {restaurant.longitude})
      </div>
    </section>
  );
};

export default MapSection;