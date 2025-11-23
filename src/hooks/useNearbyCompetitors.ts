import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RestaurantWithDistance } from '@/types/supabase'; // Importando o tipo correto

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
  latitude: number | undefined | null,
  longitude: number | undefined | null
) => {
  const [competitors, setCompetitors] = useState<NearbyCompetitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentRestaurantId || latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
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
          max_distance_km: 50, // Increased search radius to 50km
          search_query: null,
          included_categories: [],
          p_limit: 10,
          p_offset: 0
        });

        if (error) {
          throw new Error(error.message);
        }

        // Explicitly cast data to RestaurantWithDistance[]
        const nearbyRestaurants = data as RestaurantWithDistance[];

        // Filter out the current restaurant and map to the required structure
        const filteredCompetitors: NearbyCompetitor[] = nearbyRestaurants
          .filter((r) => {
            // Ensure we are comparing strings and ignoring case if necessary, though UUIDs are usually lowercase
            return String(r.id) !== String(currentRestaurantId);
          })
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