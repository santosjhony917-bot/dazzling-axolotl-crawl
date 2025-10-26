import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { useUserData } from './useAuthProfile'; // Importando useUserData

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
  const { restaurant, isLoading, refetchRestaurant } = useUserData(); // Usando useUserData

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
      // Refetch the restaurant data via useAuthProfile's refetchRestaurant
      refetchRestaurant(); 
    },
    onError: (error) => {
      showError(`Falha ao atualizar perfil: ${error.message}`);
    }
  });

  return {
    restaurant,
    isLoading,
    refetchProfile: refetchRestaurant, // Renomeando para manter a compatibilidade externa
    updateRestaurant: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}