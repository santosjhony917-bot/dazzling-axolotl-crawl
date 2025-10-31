import { supabase } from './client';
import { PublicRestaurantData, Restaurant, RestaurantPlan, OpeningHours, MenuItem, RestaurantWithDistance } from '@/types/restaurant';
import { getRestaurantOpenStatus, convertOpeningHoursToWeekSchedule } from '@/lib/schedule';
import { formatAddressSummary } from '@/lib/utils';
import { showError } from '@/utils/toast';
import { Tables } from '@/lib/database.types'; // Importando Tables do database.types

// --- Tipos Auxiliares para a Query Complexa ---

// Tipo para o resultado da query de menu_items aninhada (inclui menu_item_favorites)
type MenuItemWithFavorites = Tables<'menu_items'> & {
  menu_item_favorites: { user_id: string | null }[];
};

// Tipo para o resultado da query de menu_categories aninhada (inclui menu_items)
type MenuCategoryWithItemsAndFavorites = Tables<'menu_categories'> & {
  menu_items: MenuItemWithFavorites[];
};

// Tipo para o resultado da query principal (restaurants)
type RestaurantProfileQueryResult = Tables<'restaurants'> & {
  menu_categories: MenuCategoryWithItemsAndFavorites[];
  restaurant_gallery: Tables<'restaurant_gallery'>[];
  user_favorites: { user_id: string }[];
};

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

export type DetailedMenuItem = MenuItem & {
  restaurant: Restaurant | null;
};

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
  
  const restaurantData = Array.isArray(data.menu_categories) && data.menu_categories.length > 0 
    ? (data.menu_categories[0] as unknown as { restaurant: Restaurant }).restaurant
    : null;

  const { menu_categories, ...item } = data;

  return {
    ...(item as MenuItem),
    restaurant: restaurantData,
  } as DetailedMenuItem;
}

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

export async function fetchRestaurantById(restaurantId: string, userId: string | null): Promise<PublicRestaurantData | null> {
  const { data, error } = await supabase
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
            menu_item_favorites (user_id) // Left join
          )
        ),
        restaurant_gallery (
          id,
          image_url,
          caption,
          order_index
        ),
        user_favorites (user_id) // Left join
      `
    )
    .eq('id', restaurantId)
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching restaurant data:', error);
    return null;
  }

  if (!data) {
    return null;
  }
  
  // CORREÇÃO: Forçar a tipagem do dado retornado para o tipo complexo definido
  const restaurantData = data as unknown as RestaurantProfileQueryResult;

  // Mapear dados brutos para o tipo Restaurant
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
    opening_hours: restaurantData.opening_hours as unknown as OpeningHours[] | null, // FIX 1: TS2352
    created_at: restaurantData.created_at,
    external_url: restaurantData.external_url,
    followers_override: restaurantData.followers_override, // FIX 2: TS2339
  };

  // Processar dados aninhados
  const menuCategories = (restaurantData.menu_categories || [])
    .filter((cat) => cat.is_active)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    .map((category) => ({
      ...category,
      menu_items: (category.menu_items || [])
        .filter((item) => item.is_active)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        .map((item) => ({
          ...item,
          // Verifica se o array de favoritos tem algum item (se o usuário estiver logado, o RLS garante que só verá o seu)
          is_favorite: item.menu_item_favorites.length > 0,
        })),
    }));

  const galleryImages = (restaurantData.restaurant_gallery || [])
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    .map((image) => ({
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
  
  // Se userId for null, isFavorite será false. Se userId existir, verifica se o array de user_favorites contém o user_id (graças ao RLS).
  const isFavorite = userId ? restaurantData.user_favorites.some((fav) => fav.user_id === userId) : false;

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