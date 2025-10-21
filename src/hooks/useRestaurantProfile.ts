import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define o tipo de dados do perfil do restaurante
export interface RestaurantProfileData {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  address: string | null;
  logo_url: string | null;
  cover_url: string | null;
  plan: 'free' | 'premium' | string;
  city: string | null; // Adicionando 'city'
  // Adicione outros campos conforme necessário (latitude, longitude, etc.)
}

interface UseRestaurantProfileResult {
  restaurant: RestaurantProfileData | null;
  loading: boolean;
  error: string;
  updateRestaurant: (updates: Partial<RestaurantProfileData>) => Promise<{ error: Error | null }>;
  refetch: () => Promise<void>;
}

// Mock User ID for demonstration purposes (replace with actual auth.uid() in production)
const MOCK_USER_ID = 'mock-user-id-123'; 

// Aceitando restaurantId como argumento
export function useRestaurantProfile(restaurantId?: string): UseRestaurantProfileResult {
  const [restaurant, setRestaurant] = useState<RestaurantProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRestaurantProfile = useCallback(async () => {
    setLoading(true);
    setError('');

    // In a real application, we would use restaurantId or auth.uid()
    const userId = MOCK_USER_ID; 

    // Mocking data fetching
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock data structure based on Supabase schema
    const mockData: RestaurantProfileData = {
      id: restaurantId || 'mock-restaurant-id-456',
      user_id: userId,
      name: 'Restaurante Teste Free',
      description: 'Um restaurante de teste.',
      image_url: null,
      address: 'Rua Falsa, 123',
      logo_url: 'https://via.placeholder.com/150?text=Logo',
      cover_url: 'https://via.placeholder.com/600x200?text=Capa',
      plan: 'free',
      city: 'São Paulo', // Mocking the city
    };

    setRestaurant(mockData);
    setLoading(false);
  }, [restaurantId]); // Adicionando restaurantId como dependência

  useEffect(() => {
    fetchRestaurantProfile();
  }, [fetchRestaurantProfile]);

  const updateRestaurant = async (updates: Partial<RestaurantProfileData>): Promise<{ error: Error | null }> => {
    // Mocking update logic
    console.log("Mocking update:", updates);
    
    // Simulate database update success
    setRestaurant(prev => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });

    // In a real app:
    /*
    const { error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', restaurant?.id)
      .select();

    if (error) {
      return { error };
    }
    */

    return { error: null };
  };

  return {
    restaurant,
    loading,
    error,
    updateRestaurant,
    refetch: fetchRestaurantProfile,
  };
}