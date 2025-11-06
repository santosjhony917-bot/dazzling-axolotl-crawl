import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantWithDistance, MenuCategory, MenuItem, GalleryImage } from '@/types/supabase';
import { PublicRestaurantData } from '@/types/restaurant';
import { showError } from '@/utils/toast';
import { getRestaurantOpenStatus } from '@/lib/schedule'; // Importando a nova função
import { WeekSchedule } from '@/types/schedule'; // Adicionado import para WeekSchedule

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
const PUBLIC_RESTAURANT_BASE_SELECT = `*`; // Simplificado para buscar apenas as colunas do restaurante

/**
 * Busca os dados públicos de um restaurante pelo ID.
 * @param restaurantId O ID do restaurante.
 * @returns Os dados públicos do restaurante, incluindo menu e galeria.
 */
export async function fetchPublicRestaurantById(restaurantId: string): Promise<PublicRestaurantData | null> {
  console.log(`[fetchPublicRestaurantById] Attempting to fetch restaurant with ID: ${restaurantId}`);

  // 1. Buscar dados básicos do restaurante
  const { data: baseData, error: baseError } = await supabase
    .from('restaurants')
    .select(PUBLIC_RESTAURANT_BASE_SELECT)
    .eq('id', restaurantId)
    .single();

  if (baseError) {
    console.error(`[fetchPublicRestaurantById] Error fetching base data for ${restaurantId}:`, baseError);
    if (baseError.code === 'PGRST116') {
      console.log(`[fetchPublicRestaurantById] No restaurant found with ID: ${restaurantId} (PGRST116 error).`);
      return null;
    }
    throw new Error(`Erro ao carregar dados básicos: ${baseError.message}`);
  }

  if (!baseData) {
    console.log(`[fetchPublicRestaurantById] No base data returned for ID: ${restaurantId}.`);
    return null;
  }

  console.log(`[fetchPublicRestaurantById] Successfully fetched base data for ${restaurantId}.`);

  // 2. Buscar contagem de seguidores separadamente
  const { data: followersData, error: followersError } = await supabase
    .from('user_favorites')
    .select('count')
    .eq('restaurant_id', restaurantId)
    .returns<{ count: number }[]>(); // Definir explicitamente o tipo de retorno para count

  let followersCount = (baseData.followers_override || 0);
  if (followersError) {
    console.warn(`[fetchPublicRestaurantById] Error fetching followers count for ${restaurantId}:`, followersError);
    // Continuar sem lançar erro, followersCount permanecerá baseData.followers_override
  } else {
    followersCount += (followersData?.[0]?.count || 0);
    console.log(`[fetchPublicRestaurantById] Followers count for ${restaurantId}: ${followersCount}`);
  }

  // 3. Buscar imagens da galeria separadamente
  const { data: galleryData, error: galleryError } = await supabase
    .from('restaurant_gallery')
    .select('id, image_url, caption, order_index')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });

  let galleryImages: GalleryImage[] = [];
  if (galleryError) {
    console.warn(`[fetchPublicRestaurantById] Error fetching gallery images for ${restaurantId}:`, galleryError);
    // Continuar sem lançar erro, galleryImages permanecerá vazio
  } else {
    galleryImages = (galleryData || []) as GalleryImage[];
    console.log(`[fetchPublicRestaurantById] Fetched ${galleryImages.length} gallery images for ${restaurantId}.`);
  }
  
  // 4. Buscar categorias e itens de menu separadamente
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
    console.error(`[fetchPublicRestaurantById] Error fetching menu data for ${restaurantId}:`, menuError);
    // Não lançamos erro fatal aqui, apenas retornamos um array vazio para o menu
  } else {
    console.log(`[fetchPublicRestaurantById] Fetched ${menuData?.length || 0} menu categories for ${restaurantId}.`);
  }

  // 5. Verificar se o usuário atual favoritou este restaurante
  let isFavorite = false;
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    const { data: favoriteData, error: favoriteError } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (favoriteData && !favoriteError) {
      isFavorite = true;
    } else if (favoriteError && favoriteError.code !== 'PGRST116') { // PGRST116 significa que nenhuma linha foi encontrada
      console.warn(`[fetchPublicRestaurantById] Error checking favorite status for ${restaurantId}:`, favoriteError);
    }
  }

  // 6. Processar e combinar dados
  
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
  const sortedGalleryImages = galleryImages
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      
  // Calcular status de abertura
  const openStatus = getRestaurantOpenStatus(baseData.opening_hours as WeekSchedule | null);
  
  // Processar formas de pagamento (assumindo que é um array de strings)
  const paymentMethods = (baseData.payment_methods as string[] | null) || null;

  const result = {
    ...baseData,
    addressSummary,
    logoUrl: baseData.image_url,
    followers_count: followersCount as number,
    menu_categories: filteredMenuCategories,
    gallery_images: sortedGalleryImages,
    payment_methods: paymentMethods,
    // Adicionando status de abertura
    isOpen: openStatus.isOpen,
    statusText: openStatus.statusText,
    nextOpenTime: openStatus.nextOpenTime,
    is_favorite: isFavorite, // Adicionado ao resultado final
  } as PublicRestaurantData;

  console.log(`[fetchPublicRestaurantById] Returning restaurant data for ${restaurantId}.`);
  return result;
}