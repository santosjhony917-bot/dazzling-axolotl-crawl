import { supabase } from './client';
import { PublicRestaurantData, Restaurant, RestaurantPlan, OpeningHours, MenuItem, RestaurantWithDistance } from '@/types/restaurant';
import { getRestaurantOpenStatus, convertOpeningHoursToWeekSchedule } from '@/lib/schedule';
import { formatAddressSummary } from '@/lib/utils';
import { showError } from '@/utils/toast';

// --- Owner/Admin Functions ---

export async function fetchOwnerRestaurantData(restaurantId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching owner restaurant data:', error);
    return null;
  }

  return data as Restaurant;
}

export async function updateRestaurantProfile(restaurantId: string, data: Partial<Restaurant>): Promise<void> {
  const { error } = await supabase
    .from('restaurants')
    .update(data)
    .eq('id', restaurantId);

  if (error) {
    console.error('Error updating restaurant profile:', error);
    throw new Error(error.message);
  }
}

// --- Public/Client Functions ---

// Define DetailedMenuItem explicitly here to resolve generic issues in useQuery
export interface DetailedMenuItem extends MenuItem {
  restaurant: Restaurant | null;
}

// Função para buscar um único item de menu por ID, incluindo dados do restaurante
export async function fetchMenuItemById(itemId: string): Promise<DetailedMenuItem | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
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
  const restaurantData = Array.isArray(data.menu_categories) && data.menu_categories.length > 0 
    ? (data.menu_categories[0] as unknown as { restaurant: Restaurant }).restaurant
    : null;

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

  return data || [];
}

// Função para buscar um restaurante público por ID
export async function fetchRestaurantById(restaurantId: string, userId: string | null): Promise<PublicRestaurantData | null> {
  const { data: restaurantData, error } = await supabase
    .from('restaurants')
    .select(
      `
        *,
        menu_categories (
          id,
          name,
          order_index,
          is_active,
          menu_items (
            id,
            name,
            description,
            price,
            image_url,
            order_index,
            is_active,
            menu_item_favorites!inner (user_id)
          )
        ),
        restaurant_gallery (
          id,
          image_url,
          caption,
          order_index
        ),
        user_favorites!inner (user_id)
      `
    )
    .eq('id', restaurantId)
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching restaurant data:', error);
    return null;
  }

  if (!restaurantData) {
    return null;
  }

  // Mapear dados brutos para o tipo PublicRestaurantData
  const baseData: Restaurant = {
    id: restaurantData.id,
    user_id: restaurantData.user_id,
    name: restaurantData.name,
    description: restaurantData.description,
    image_url: restaurantData.image_url,
    cover_image_url: restaurantData.cover_image_url,
    plan: restaurantData.plan as RestaurantPlan,
    phone: restaurantData.phone,
    email: restaurantData.email,
    cnpj: restaurantData.cnpj,
    category: restaurantData.category,
    whatsapp_url: restaurantData.whatsapp_url,
    ifood_url: restaurantData.ifood_url,
    other_url: restaurantData.other_url,
    address: restaurantData.address,
    number: restaurantData.number,
    neighborhood: restaurantData.neighborhood,
    city: restaurantData.city,
    state: restaurantData.state,
    cep: restaurantData.cep,
    latitude: restaurantData.latitude,
    longitude: restaurantData.longitude,
    opening_hours: restaurantData.opening_hours as OpeningHours[] | null,
    created_at: restaurantData.created_at,
    external_url: restaurantData.external_url,
    followers_override: restaurantData.followers_override,
  };

  // Processar dados aninhados
  const menuCategories = (restaurantData.menu_categories || [])
    .filter((cat: any) => cat.is_active)
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .map((category: any) => ({
      ...category,
      menu_items: (category.menu_items || [])
        .filter((item: any) => item.is_active)
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((item: any) => ({
          ...item,
          is_favorite: item.menu_item_favorites.length > 0,
        })),
    }));

  const galleryImages = (restaurantData.restaurant_gallery || [])
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .map((image: any) => ({
      id: image.id,
      restaurant_id: image.restaurant_id,
      image_url: image.image_url,
      caption: image.caption,
      order_index: image.order_index,
      created_at: image.created_at,
    }));

  // Calcular status de abertura
  const scheduleWeek = convertOpeningHoursToWeekSchedule(baseData.opening_hours);
  const openStatus = getRestaurantOpenStatus(scheduleWeek);

  // Calcular seguidores
  const followersCount = restaurantData.user_favorites.length + (baseData.followers_override || 0);
  const isFavorite = userId ? restaurantData.user_favorites.some((fav: any) => fav.user_id === userId) : false;

  return {
    ...baseData,
    followers_count: followersCount,
    is_favorite: isFavorite,
    addressSummary: formatAddressSummary(baseData.address, baseData.number, baseData.neighborhood, baseData.city, baseData.state),
    isOpen: openStatus.isOpen,
    statusText: openStatus.statusText,
    menu_categories: menuCategories,
    gallery_images: galleryImages,
  };
}