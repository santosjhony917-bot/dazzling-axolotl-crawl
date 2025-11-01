"use client";

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RestaurantWithDistance } from '@/types/supabase'; // Importando o tipo correto
import { fetchNearbyRestaurants } from '@/integrations/supabase/restaurants';
import RestaurantCard from '@/components/RestaurantCard';
import { Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';

const RestaurantResults: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('query');
  const lat = parseFloat(queryParams.get('lat') || '0');
  const lng = parseFloat(queryParams.get('lng') || '0');

  const { data: restaurants, isLoading, error } = useQuery<RestaurantWithDistance[] | null, Error>({
    queryKey: ['searchResults', searchQuery, lat, lng],
    queryFn: () => fetchNearbyRestaurants(lat, lng, 50, searchQuery),
    enabled: !!(lat && lng), // Only run if valid coordinates are available
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    showError('Erro ao buscar restaurantes.');
    return (
      <div className="text-center text-red-500 py-8">
        <p>Não foi possível carregar os resultados da busca. Por favor, tente novamente mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-[#022D68] mb-6">
        Resultados da Busca {searchQuery ? `para "${searchQuery}"` : ''}
      </h1>

      {restaurants && restaurants.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {restaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <p>Nenhum restaurante encontrado com os critérios de busca.</p>
        </div>
      )}
    </div>
  );
};

export default RestaurantResults;