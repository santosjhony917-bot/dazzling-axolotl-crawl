import { useAuthContext } from '@/context/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';

interface UpdateRestaurantPayload {
  name?: string;
  description?: string;
  image_url?: string;
  cover_image_url?: string;
  phone?: string;
  email?: string;
  cnpj?: string;
  category?: string;
  whatsapp_url?: string;
  ifood_url?: string;
  other_url?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
  opening_hours?: any;
  external_url?: string;
}

export function useRestaurantProfile() {
  const { restaurant, isLoading, refetchProfile } = useAuthContext();

  const mutation = useMutation<void, Error, UpdateRestaurantPayload>({
    mutationFn: async (updates) => {
      if (!restaurant?.id) {
        throw new Error("Restaurant ID is missing. Cannot update profile.");
      }

      const { error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', restaurant.id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      showSuccess("Perfil do restaurante atualizado com sucesso!");
      // Refetch the profile data from AuthContext to update the UI globally
      refetchProfile(); 
    },
    onError: (error) => {
      showError(`Falha ao atualizar perfil: ${error.message}`);
    }
  });

  return {
    restaurant,
    isLoading, // Renamed from loading
    refetchProfile, // Renamed from refetch
    updateRestaurant: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}