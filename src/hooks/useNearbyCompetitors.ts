import { useState, useEffect } from 'react';
import { fetchNearbyPublicCatalogRestaurants } from '@/integrations/supabase/publicCatalog';

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
        const nearbyRestaurants = await fetchNearbyPublicCatalogRestaurants({
          latitude,
          longitude,
          maxDistanceKm: 10,
          limit: 50,
        });

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
