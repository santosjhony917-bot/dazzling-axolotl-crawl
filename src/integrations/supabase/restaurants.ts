import { supabase } from './client';
import { Restaurant, PublicRestaurantData } from '@/types/restaurant';
import { WeekSchedule } from '@/types/schedule'; // Importando WeekSchedule do novo arquivo
import { getRestaurantOpenStatus } from '@/lib/schedule';

// Função para buscar um restaurante público por ID
export async function getPublicRestaurantById(id: string): Promise<PublicRestaurantData | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      menu_categories (
        id, name, order_index, is_active, is_popular,
        menu_items (id, name, description, price, image_url, order_index, is_active)
      ),
      restaurant_gallery (id, image_url, caption, order_index)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching public restaurant:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Mapear os dados para o tipo PublicRestaurantData
  const baseData: PublicRestaurantData = {
    ...data,
    menu_categories: data.menu_categories || [],
    gallery_images: data.restaurant_gallery || [],
    // Certifique-se de que opening_hours é do tipo WeekSchedule
    opening_hours: data.opening_hours as WeekSchedule | null,
    payment_methods: data.payment_methods as string[] | null,
    social_networks: data.social_networks as any[] | null, // Ajustar se SocialNetworkLink for mais complexo
  };

  // Calcular status de abertura
  const openStatus = getRestaurantOpenStatus(baseData.opening_hours);

  return {
    ...baseData,
    isOpen: openStatus.isOpen,
    statusText: openStatus.statusText,
    addressSummary: baseData.address ? `${baseData.address}, ${baseData.number || 'S/N'} - ${baseData.neighborhood}, ${baseData.city} - ${baseData.state}` : null,
  };
}

// Função para buscar restaurantes próximos
export async function findNearbyRestaurants(
  user_lat: number,
  user_lng: number,
  max_distance_km: number = 10,
  search_query: string | null = null
): Promise<PublicRestaurantData[]> {
  const { data, error } = await supabase.rpc('find_nearby_restaurants', {
    user_lat,
    user_lng,
    max_distance_km,
    search_query,
  });

  if (error) {
    console.error('Error finding nearby restaurants:', error);
    return [];
  }

  return data || [];
}

// Função para atualizar um restaurante (para uso administrativo ou pelo proprietário)
export async function updateRestaurant(
  restaurantId: string,
  updates: Partial<Omit<Restaurant, 'id' | 'created_at' | 'user_id'>> // Omitindo campos que não devem ser atualizados diretamente
) {
  const { data, error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', restaurantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating restaurant:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// Função para adicionar um restaurante
export async function addRestaurant(newRestaurant: Omit<Restaurant, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('restaurants')
    .insert(newRestaurant)
    .select()
    .single();

  if (error) {
    console.error('Error adding restaurant:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// Função para deletar um restaurante
export async function deleteRestaurant(restaurantId: string) {
  const { error } = await supabase
    .from('restaurants')
    .delete()
    .eq('id', restaurantId);

  if (error) {
    console.error('Error deleting restaurant:', error);
    return { success: false, error };
  }

  return { success: true, error: null };
}