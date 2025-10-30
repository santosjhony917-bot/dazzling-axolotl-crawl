import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RestaurantWithDistance } from '@/types/supabase'; // Importando o tipo correto

// Define o tipo retornado pela RPC, que é Restaurant + distance_km obrigatório
// Usamos RestaurantWithDistance diretamente do types/supabase
type RpcRestaurantResult = RestaurantWithDistance;

interface NearbyCompetitor {
  id: string;
  name: string;
  distance_km: number;
  category: string;
  imageUrl: string;
}

/**
 * Fetches nearby restaurants (competitors) based on the provided location,
 * excluding the restaurant with the given ID.
 */
export const useNearbyCompetitors = (
  currentRestaurantId: string | undefined,
  latitude: number | undefined,
  longitude: number | undefined
) => {
  const [competitors, setCompetitors] = useState<NearbyCompetitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentRestaurantId || latitude === undefined || longitude === undefined) {
      setIsLoading(false);
      return;
    }

    const fetchCompetitors = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Using the existing RPC function to find nearby restaurants
        const { data, error } = await supabase.rpc('find_nearby_restaurants', {
          user_lat: latitude,
          user_lng: longitude,
          max_distance_km: 10, // Default search radius of 10km
          search_query: null,
        });

        if (error) {
          throw new Error(error.message);
        }

        // Explicitly cast data to RpcRestaurantResult[]
        const nearbyRestaurants = data as RpcRestaurantResult[];

        // Filter out the current restaurant and map to the required structure
        const filteredCompetitors: NearbyCompetitor[] = nearbyRestaurants
          .filter((r) => r.id !== currentRestaurantId)
          .map((r) => ({
            id: r.id,
            name: r.name,
            distance_km: r.distance_km, 
            category: r.category || 'Geral',
            imageUrl: r.image_url || 'https://via.placeholder.com/150?text=Restaurante',
          }));

        setCompetitors(filteredCompetitors);
      } catch (err) {
        console.error('Error fetching nearby competitors:', err);
        setError('Falha ao carregar concorrentes próximos.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompetitors();
  }, [currentRestaurantId, latitude, longitude]);

  return { competitors, isLoading, error };
};