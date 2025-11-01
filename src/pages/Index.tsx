import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// Define o tipo Restaurant com base no esquema do Supabase
type Restaurant = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  plan: 'free' | 'basic' | 'premium';
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  city: string | null;
  state: string | null;
  distance_km: number | null;
};

const fetchRestaurants = async (): Promise<Restaurant[]> => {
  // Coordenadas de exemplo para buscar restaurantes próximos (pode ser substituído pela localização do usuário)
  const userLat = -23.5505; // Latitude de São Paulo
  const userLng = -46.6333; // Longitude de São Paulo
  const maxDistanceKm = 100; // Distância máxima para busca

  const { data, error } = await supabase.rpc('find_nearby_restaurants', {
    user_lat: userLat,
    user_lng: userLng,
    max_distance_km: maxDistanceKm,
    search_query: null, // Sem termo de busca inicial
  });

  if (error) {
    console.error('Erro ao buscar restaurantes:', error);
    throw error;
  }

  // Filtra restaurantes cujo nome contém "teste" (case-insensitive)
  return data.filter((restaurant: Restaurant) => !restaurant.name.toLowerCase().includes('teste'));
};

export default function Index() {
  const { data: restaurants, isLoading, error } = useQuery<Restaurant[], Error>({
    queryKey: ['restaurants', 'nearby'],
    queryFn: fetchRestaurants,
  });

  if (error) {
    return <div className="p-4 text-red-500">Erro ao carregar restaurantes: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Descubra Restaurantes Próximos</h1>
      
      <div className="mb-6">
        <Input placeholder="Buscar restaurantes..." className="w-full max-w-md mx-auto" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {restaurants?.length === 0 ? (
            <p className="col-span-full text-center text-gray-500">Nenhum restaurante encontrado.</p>
          ) : (
            restaurants?.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))
          )}
        )}
        </div>
      )}
    </div>
  );
}