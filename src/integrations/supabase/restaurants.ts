import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantWithDistance } from '@/types/supabase';
import { PublicRestaurantData } from '@/types/restaurant';
import { showError } from '@/utils/toast';

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

// Define a string de seleção para o perfil público
const PUBLIC_RESTAURANT_SELECT = `
    *,
    followers_count:user_favorites(count),
    gallery_images:restaurant_gallery(id, image_url, caption, order_index),
    menu_categories(
        id, 
        name, 
        order_index, 
        is_active,
        menu_items(
            id, 
            name, 
            description, 
            price, 
            image_url, 
            order_index, 
            is_active
        )
    )
`;

/**
 * Busca os dados públicos de um restaurante pelo ID.
 * @param restaurantId O ID do restaurante.
 * @returns Os dados públicos do restaurante, incluindo menu e galeria.
 */
export async function fetchPublicRestaurantById(restaurantId: string): Promise<PublicRestaurantData | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select(PUBLIC_RESTAURANT_SELECT)
    .eq('id', restaurantId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching public restaurant (NOT PGRST116):', error); // Log mais detalhado
    return null;
  }

  if (!data) {
    console.log(`[fetchPublicRestaurantById] No data found for ID: ${restaurantId}`);
    return null;
  }

  // 1. Processar contagem de seguidores (incluindo override)
  const followersCount = (data.followers_count?.[0]?.count || 0) + (data.followers_override || 0);

  // 2. Constrói o resumo do endereço
  const addressParts = [data.city, data.state].filter(Boolean);
  const addressSummary = addressParts.length > 0 ? addressParts.join(', ') : null;

  // 3. Filtrar categorias e itens inativos
  const activeMenuCategories = data.menu_categories
      .filter(cat => cat.is_active)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(category => ({
          ...category,
          menu_items: category.menu_items
              .filter(item => item.is_active)
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      }));
      
  // 4. Ordenar galeria
  const galleryImages = data.gallery_images
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  return {
    ...data,
    addressSummary,
    logoUrl: data.image_url, // Mantendo a compatibilidade com o tipo PublicRestaurantData
    followers_count: followersCount as number,
    menu_categories: activeMenuCategories,
    gallery_images: galleryImages,
  } as PublicRestaurantData;
}