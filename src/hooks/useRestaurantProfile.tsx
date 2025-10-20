import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WeekSchedule } from '@/types/schedule';

interface RestaurantProfileData {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  cep: string;
  neighborhood: string;
  category: string;
  logo_url: string | null;
  cover_image_url: string | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: WeekSchedule | null;
  phone: string | null; // Adicionado
  email: string | null; // Adicionado
  cnpj: string | null;  // Adicionado
}

export function useRestaurantProfile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<RestaurantProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setIsUserLoading(false);
    };
    fetchUserId();
  }, []);

  const fetchRestaurant = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch from the 'restaurants' table
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw new Error(error.message);
      }
      
      if (data) {
        setRestaurant(data as RestaurantProfileData);
      } else {
        setRestaurant(null); // No restaurant found for this user
      }

    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading && userId) {
      fetchRestaurant(userId);
    } else if (!isUserLoading && !userId) {
      setLoading(false);
    }
  }, [userId, isUserLoading]);

  const updateRestaurant = async (updates: Partial<RestaurantProfileData>) => {
    if (!restaurant?.id) return { error: "Restaurante não encontrado." };
    
    const { error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', restaurant.id);

    if (error) {
      return { error: error.message };
    }

    // Refetch to get the latest data after update
    await fetchRestaurant(restaurant.id);
    
    return { error: null };
  };

  return {
    restaurant,
    loading: loading || isUserLoading,
    error,
    updateRestaurant,
    refetch: () => userId && fetchRestaurant(userId),
  };
}