import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

interface UpdatePayload {
  restaurantId: string;
  data: Partial<{
    name: string;
    description: string;
    image_url: string;
    cover_image_url: string;
    phone: string;
    email: string;
    cnpj: string;
    category: string;
    whatsapp_url: string;
    ifood_url: string;
    other_url: string;
    address: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    latitude: number;
    longitude: number;
    opening_hours: any;
  }>;
}

const updateRestaurantData = async ({ restaurantId, data }: UpdatePayload) => {
  const { error } = await supabase
    .from('restaurants')
    .update(data)
    .eq('id', restaurantId);

  if (error) {
    throw new Error(error.message);
  }
};

export const useRestaurantUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRestaurantData,
    onSuccess: (_, variables) => {
      // Invalida as queries de restaurante para buscar os dados atualizados
      queryClient.invalidateQueries({ queryKey: ['restaurant', variables.restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['myRestaurants'] });
      // NOVO: Invalida a query do perfil público para garantir que os dados sejam atualizados
      queryClient.invalidateQueries({ queryKey: ['publicRestaurant', variables.restaurantId] });
    },
    onError: (error) => {
      console.error("Update failed:", error);
      toast.error("Erro ao salvar as alterações. Tente novamente.");
    },
  });
};