import { supabase } from './client';
import { PublicRestaurantData, Restaurant, RestaurantPlan, OpeningHours } from '@/types/restaurant';
import { getRestaurantOpenStatus, convertOpeningHoursToWeekSchedule } from '@/lib/schedule';
import { formatAddressSummary } from '@/lib/utils';

// Função auxiliar para buscar dados de um restaurante pelo ID
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
  const scheduleWeek = convertOpeningHoursToWeekSchedule(baseData.opening_hours); // CONVERSÃO APLICADA
  const openStatus = getRestaurantOpenStatus(scheduleWeek); // Erro 3 corrigido

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

// Função auxiliar para buscar dados de um restaurante pelo ID (para o proprietário)
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