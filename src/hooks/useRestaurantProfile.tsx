import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantProfileFormValues } from '@/types/restaurant';
import { toast } from 'sonner';

// Type used for updating the database, derived from form values
type RestaurantUpdate = Omit<RestaurantProfileFormValues, 'image_file' | 'cover_image_file'>;

export const useRestaurantProfile = (initialRestaurant?: Restaurant | null) => {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(initialRestaurant ?? null);
  const [isLoading, setIsLoading] = useState(false);

  const refetchProfile = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching restaurant:', error);
      toast.error('Erro ao carregar perfil do restaurante.');
      setRestaurant(null);
    } else {
      setRestaurant(data);
    }
    setIsLoading(false);
  }, [user]);

  const updateRestaurant = useCallback(async (data: RestaurantProfileFormValues) => {
    if (!restaurant) {
      toast.error('Restaurante não encontrado para atualização.');
      return;
    }

    setIsLoading(true);

    const updates: RestaurantUpdate = {
      name: data.name,
      description: data.description,
      category: data.category,
      phone: data.phone,
      email: data.email,
      cnpj: data.cnpj,
      whatsapp_url: data.whatsapp_url,
      ifood_url: data.ifood_url,
      other_url: data.other_url,
      address: data.address,
      number: data.number,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      cep: data.cep,
      latitude: data.latitude,
      longitude: data.longitude,
      opening_hours: data.opening_hours,
      image_url: data.image_url,
      cover_image_url: data.cover_image_url,
      external_url: data.external_url,
    };

    // Adicionando cast intermediário para 'unknown' para resolver a incompatibilidade de 'opening_hours' (jsonb)
    const { data: updatedData, error } = await supabase
      .from('restaurants')
      .update(updates as unknown as Partial<Restaurant>)
      .eq('id', restaurant.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating restaurant:', error);
      toast.error('Erro ao atualizar perfil do restaurante.');
    } else {
      setRestaurant(updatedData);
      toast.success('Perfil do restaurante atualizado com sucesso!');
    }

    setIsLoading(false);
  }, [restaurant]);

  return {
    restaurant,
    isLoading,
    refetchProfile,
    updateRestaurant,
  };
};