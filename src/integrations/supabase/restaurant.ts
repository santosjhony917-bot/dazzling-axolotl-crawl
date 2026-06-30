import { supabase } from './client';
import { MenuCategory, MenuItem, Restaurant, GalleryImage, RestaurantWithDistance } from '@/types/supabase';
import { PublicRestaurantData } from '@/types/restaurant';
import { showError } from '@/utils/toast';

// Função para buscar um único item de menu por ID, incluindo dados do restaurante
export async function fetchMenuItemById(itemId: string): Promise<(MenuItem & { restaurant: Restaurant | null }) | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      menu_option_groups(
        id,
        name,
        min_quantity,
        max_quantity,
        is_required,
        order_index,
        semantic_type,
        price_behavior,
        menu_item_options(
          id,
          name,
          description,
          price,
          price_delta,
          min_quantity,
          max_quantity,
          is_required,
          order_index,
          semantic_type,
          price_behavior,
          search_label,
          search_aliases
        )
      ),
      menu_categories (
        restaurant:restaurants (*)
      )
    `)
    .eq('id', itemId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching menu item:', error);
    throw new Error(error.message);
  }

  if (!data) return null;
  
  // Extract the restaurant data from the nested menu_categories array
  // data.menu_categories is an array of objects, each containing { restaurant: Restaurant }
  const categoryRelation = (data as any).menu_categories;
  const restaurantData = Array.isArray(categoryRelation)
    ? ((categoryRelation[0] as unknown as { restaurant: Restaurant })?.restaurant || null)
    : ((categoryRelation as unknown as { restaurant: Restaurant })?.restaurant || null);

  // Remove the nested key before returning
  const { menu_categories, ...item } = data;

  return {
    ...(item as MenuItem),
    restaurant: restaurantData,
  };
}

// Função para buscar restaurantes próximos (usando a função SQL find_nearby_restaurants)
export async function fetchNearbyRestaurants(
  lat: number, 
  lng: number, 
  maxDistance: number = 10, 
  searchQuery: string | null = null
): Promise<RestaurantWithDistance[]> {
  const { data: deletedRests } = await supabase
    .from('restaurants')
    .select('id')
    .eq('is_deleted', true);
  const deletedIds = new Set(deletedRests?.map(r => r.id) || []);

  const { data, error } = await supabase.rpc('find_nearby_restaurants', {
    user_lat: lat,
    user_lng: lng,
    max_distance_km: maxDistance,
    search_query: searchQuery,
  });

  if (error) {
    console.error('Error fetching nearby restaurants:', error);
    showError('Erro ao buscar restaurantes próximos.');
    return [];
  }

  const list = data || [];
  return list.filter((r: any) => !deletedIds.has(r.id));
}

// Função para buscar um restaurante público por ID
export async function fetchPublicRestaurantById(restaurantId: string): Promise<PublicRestaurantData | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      followersCount:user_favorites(count)
    `)
    .eq('id', restaurantId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching public restaurant:', error);
    return null;
  }

  if (!data || data.is_published !== true || data.menu_status !== 'found') return null;

  // Simulação de addressSummary e logoUrl (que pode ser image_url)
  const addressSummary = data.city && data.state ? `${data.city}, ${data.state}` : data.address;
  const logoUrl = data.image_url;
  const followersCount = Array.isArray(data.followersCount) && data.followersCount.length > 0 
    ? data.followersCount[0].count || 0 
    : 0;

  return {
    ...data,
    addressSummary,
    logoUrl,
    followersCount: followersCount as number,
  } as PublicRestaurantData;
}
