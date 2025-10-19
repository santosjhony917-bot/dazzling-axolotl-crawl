import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
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
}

export function useRestaurantProfile() {
  const { userId, isLoading: isRoleLoading } = useUserRole();
  const [restaurant, setRestaurant] = useState<RestaurantProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurant = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Mock data structure for initial load
      const mockData: RestaurantProfileData = {
        id: id,
        name: "Cachorro Quente do Zé",
        address: "Rua Fictícia, 123",
        city: "João Pessoa",
        state: "PB",
        cep: "58039-000",
        neighborhood: "Tambaú",
        category: "Lanches",
        logo_url: null,
        cover_image_url: null,
        whatsapp_url: null,
        ifood_url: null,
        other_url: null,
        latitude: -7.1195,
        longitude: -34.8450,
        opening_hours: null,
      };
      
      // In a real app, we would fetch from the 'restaurants' table
      // const { data, error } = await supabase.from('restaurants').select('*').eq('user_id', id).single();
      
      // Mocking successful fetch
      setRestaurant(mockData);

    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isRoleLoading && userId) {
      fetchRestaurant(userId);
    } else if (!isRoleLoading && !userId) {
      setLoading(false);
    }
  }, [userId, isRoleLoading]);

  const updateRestaurant = async (updates: Partial<RestaurantProfileData>) => {
    if (!restaurant?.id) return { error: "Restaurante não encontrado." };
    
    // Mocking update
    setRestaurant(prev => ({ ...prev!, ...updates }));
    
    // In a real app:
    // const { error } = await supabase.from('restaurants').update(updates).eq('id', restaurant.id);
    
    return { error: null };
  };

  return {
    restaurant,
    loading: loading || isRoleLoading,
    error,
    updateRestaurant,
    refetch: () => userId && fetchRestaurant(userId),
  };
}