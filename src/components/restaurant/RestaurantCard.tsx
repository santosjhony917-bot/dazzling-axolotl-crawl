import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  address: string | null;
  plan: 'free' | 'basic' | 'premium';
  latitude: number | null;
  longitude: number | null;
  distance_km: number;
  category: string | null;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  // Mock de avaliação, pois não temos a tabela de avaliações
  const mockRating = 4.7; 
  const mockReviews = 500;

  const distanceText = restaurant.distance_km ? `${restaurant.distance_km.toFixed(1)}km` : 'Distância indisponível';
  const categoryText = restaurant.category || 'Geral';

  return (
    <div className="flex items-center bg-white dark:bg-zinc-800 rounded-xl shadow-md overflow-hidden mb-4 p-3 transition-shadow duration-300 hover:shadow-lg border border-gray-100 dark:border-zinc-700">
      <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden mr-4">
        <img
          className="w-full h-full object-cover"
          src={restaurant.image_url || 'https://via.placeholder.com/150?text=Restaurante'}
          alt={restaurant.name}
        />
      </div>
      <div className="flex flex-col justify-center flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {restaurant.name}
        </h3>
        <div className="flex items-center mt-1 text-sm">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
          <span className="font-bold text-gray-800 dark:text-gray-200 mr-1">{mockRating.toFixed(1)}</span>
          <span className="text-gray-500 dark:text-gray-400">({mockReviews}+)</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
          {categoryText} • {distanceText}
        </p>
      </div>
    </div>
  );
};

export default RestaurantCard;