import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RestaurantProfile } from '@/types/restaurant'; // Corrigido para RestaurantProfile
import { toast } from 'sonner';

export const useRestaurantProfile = (id: string) => {
  return useQuery<RestaurantProfile | null, Error>({
    queryKey: ['restaurantProfile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_gallery(id, image_url, caption, order_index),
          menu_categories(
            id, name, order_index, is_active, is_popular,
            menu_items(id, name, description, price, image_url, order_index, is_active)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        toast.error(`Erro ao carregar perfil do restaurante: ${error.message}`);
        throw error;
      }
      if (!data) {
        return null;
      }

      // Transformar os dados para o tipo RestaurantProfile
      const restaurantProfile: RestaurantProfile = {
        ...data,
        followers_count: 0, // Será preenchido no frontend ou por outra função
        isOpen: false, // Será preenchido no frontend
        statusText: 'Fechado', // Será preenchido no frontend
        distance: null, // Será preenchido no frontend
        is_favorite: false, // Será preenchido no frontend
        fullAddress: '', // Será preenchido no frontend
        addressSummary: '', // Será preenchido no frontend
        restaurant_gallery: data.restaurant_gallery || [],
        menu_categories: data.menu_categories || [],
        user_favorites: [], // Não está sendo selecionado aqui, então inicializa vazio
        social_networks: data.social_networks as RestaurantProfile['social_networks'], // Cast para o tipo correto
        opening_hours: data.opening_hours as RestaurantProfile['opening_hours'], // Cast para o tipo correto
      };

      return restaurantProfile;
    },
    enabled: !!id,
  });
};