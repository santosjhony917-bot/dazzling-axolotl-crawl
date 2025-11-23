import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RestaurantWithDistance } from '@/types/supabase';

interface UseNearbyRestaurantsByRoleProps {
  maxDistanceKm: number;
  requiredRole: string;
  enabled: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export const useNearbyRestaurantsByRole = ({
  maxDistanceKm,
  requiredRole,
  enabled,
  latitude,
  longitude,
}: UseNearbyRestaurantsByRoleProps) => {
  const [restaurants, setRestaurants] = useState<RestaurantWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRestaurants([]);
      return;
    }

    const fetchRestaurants = async () => {
      setLoading(true);
      setError(null);

      try {
        let lat = latitude;
        let lng = longitude;

        // If lat/lon not provided, try to fetch from logged in restaurant
        if (!lat || !lng) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: restaurant } = await supabase
                .from('restaurants')
                .select('latitude, longitude')
                .eq('user_id', user.id)
                .single();
                
                if (restaurant) {
                    lat = restaurant.latitude;
                    lng = restaurant.longitude;
                }
            }
        }

        if (!lat || !lng) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.rpc('find_nearby_restaurants', {
          user_lat: lat,
          user_lng: lng,
          max_distance_km: maxDistanceKm,
          search_query: null,
          included_categories: [],
          p_limit: 10,
          p_offset: 0
        });

        if (error) throw error;

        let filtered = (data as RestaurantWithDistance[]) || [];

        // Filter by role
        if (requiredRole === 'premium_restaurant') {
            filtered = filtered.filter(r => r.plan === 'premium' || r.plan === 'premium_gift');
        }

        setRestaurants(filtered);

      } catch (err) {
        console.error('Error fetching nearby restaurants by role:', err);
        setError('Erro ao buscar restaurantes próximos.');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [maxDistanceKm, requiredRole, enabled, latitude, longitude]);

  return { restaurants, loading, error };
};
