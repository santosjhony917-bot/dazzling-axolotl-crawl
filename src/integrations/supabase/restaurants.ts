import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantWithDistance, MenuCategory, MenuItem, GalleryImage } from '@/types/supabase';
import { PublicRestaurantData, SocialNetworkLink, WeekSchedule } from '@/types/restaurant';
import { showError } from '@/utils/toast';
import { getRestaurantOpenStatus } from '@/lib/schedule';

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

// Define a string de seleção para os dados básicos do perfil público
const PUBLIC_RESTAURANT_BASE_SELECT = `
    *,
    followers_count:user_favorites(count),
    gallery_images:restaurant_gallery(id, image_url, caption, order_index)
`;

/**
 * Busca os dados públicos de um restaurante pelo ID.
 * @param restaurantId O ID do restaurante.
 * @returns Os dados públicos do restaurante, incluindo menu e galeria.
 */
export async function fetchPublicRestaurantById(restaurantId: string): Promise<PublicRestaurantData | null> {
  // 1. Buscar dados básicos, seguidores e galeria (sem menu aninhado)
  const { data: baseData, error: baseError } = await supabase
    .from('restaurants')
    .select(PUBLIC_RESTAURANT_BASE_SELECT)
    .eq('id', restaurantId)
    .single();

  if (baseError && baseError.code !== 'PGRST116') {
    console.error('Error fetching public restaurant base data:', baseError);
    throw new Error(`Erro ao carregar dados básicos: ${baseError.message}`);
  }

  if (!baseData) {
    return null;
  }

  // 2. Buscar categorias e itens de menu separadamente
  const { data: menuData, error: menuError } = await supabase
    .from('menu_categories')
    .select(`
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
    `)
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });

  if (menuError) {
    console.error('Error fetching menu data:', menuError);
    // Não lançamos erro fatal aqui, apenas retornamos um array vazio para o menu
  }

  // 3. Processar e combinar dados

  // Processar contagem de seguidores (incluindo override)
  const followersCount = (baseData.followers_count?.[0]?.count || 0) + (baseData.followers_override || 0);

  // Constrói o resumo do endereço
  const addressParts = [baseData.city, baseData.state].filter(Boolean);
  const addressSummary = addressParts.length > 0 ? addressParts.join(', ') : null;

  // Filtrar categorias e itens inativos
  const activeMenuCategories = (menuData || []) as unknown as (MenuCategory & { menu_items: MenuItem[] })[];

  const filteredMenuCategories = activeMenuCategories
      .filter(cat => cat.is_active)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(category => ({
          ...category,
          menu_items: category.menu_items
              .filter(item => item.is_active)
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      }));

  // Ordenar galeria
  const galleryImages = (baseData.gallery_images || []) as unknown as GalleryImage[];

  const sortedGalleryImages = galleryImages
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  // Calcular status de abertura
  const openStatus = getRestaurantOpenStatus(baseData.opening_hours as WeekSchedule);

  // Processar formas de pagamento (assumindo que é um array de strings)
  const paymentMethods = (baseData.payment_methods as string[] | null) || null;

  // Processar redes sociais
  const socialNetworks = (baseData.social_networks as SocialNetworkLink[] | null) || null;

  return {
    ...baseData,
    addressSummary,
    logoUrl: baseData.image_url,
    followers_count: followersCount as number,
    menu_categories: filteredMenuCategories,
    gallery_images: sortedGalleryImages,
    payment_methods: paymentMethods,
    social_networks: socialNetworks,
    is_favorite: false,
    // Adicionando status de abertura
    isOpen: openStatus.isOpen,
    statusText: openStatus.statusText,
    nextOpenTime: openStatus.nextOpenTime,
  } as PublicRestaurantData;
}