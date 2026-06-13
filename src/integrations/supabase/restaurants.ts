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

  if (restaurantId && (restaurantId.startsWith('mock-') || restaurantId.startsWith('scraped-'))) {
    const isPremium = restaurantId.includes('premium');
    
    // Tenta carregar do localStorage mockSession ou mock-completed-restaurants
    let savedMockRestaurant = null;
    try {
      const saved = localStorage.getItem('mockSession');
      if (saved) {
        const session = JSON.parse(saved);
        if (session.restaurant && session.restaurant.id === restaurantId) {
          savedMockRestaurant = session.restaurant;
        }
      }
      if (!savedMockRestaurant) {
        const completedSaved = localStorage.getItem('mock-completed-restaurants');
        if (completedSaved) {
          const completedMap = JSON.parse(completedSaved);
          if (completedMap[restaurantId]) {
            savedMockRestaurant = completedMap[restaurantId];
          }
        }
      }
    } catch (e) {
      console.error('Erro ao ler mock em fetchPublicRestaurantById:', e);
    }

    if (savedMockRestaurant && savedMockRestaurant.visit_status && savedMockRestaurant.visit_status !== 'Visitado') {
      console.log(`[fetchPublicRestaurantById] Mock restaurant is not validated: ${restaurantId}`);
      return null;
    }

    const name = savedMockRestaurant?.name || (isPremium ? 'Sabor Premium Gourmet' : 'Lancheira do Zé (Free)');
    const phone = savedMockRestaurant?.phone || (isPremium ? '(11) 99999-9999' : '(11) 98888-8888');
    const cep = savedMockRestaurant?.cep || (isPremium ? '01310-100' : '01310-200');
    const address = savedMockRestaurant?.address || 'Avenida Paulista';
    const number = savedMockRestaurant?.number || (isPremium ? '1000' : '2000');
    const neighborhood = savedMockRestaurant?.neighborhood || 'Bela Vista';
    const city = savedMockRestaurant?.city || 'São Paulo';
    const state = savedMockRestaurant?.state || 'SP';
    const logoUrl = savedMockRestaurant?.image_url || savedMockRestaurant?.logoUrl || (isPremium ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500' : '');
    const coverUrl = savedMockRestaurant?.cover_image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000';
    const paymentMethods = savedMockRestaurant?.payment_methods || ['Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Dinheiro'];
    const openingHours = savedMockRestaurant?.opening_hours || {
      monday: { isOpen: true, slots: [{ start: '11:00', end: '22:00' }] },
      tuesday: { isOpen: true, slots: [{ start: '11:00', end: '22:00' }] },
      wednesday: { isOpen: true, slots: [{ start: '11:00', end: '22:00' }] },
      thursday: { isOpen: true, slots: [{ start: '11:00', end: '22:00' }] },
      friday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
      saturday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
      sunday: { isOpen: true, slots: [{ start: '12:00', end: '21:00' }] }
    };
    
    // Calcular status de abertura dinamicamente para o mock também
    const openStatus = getRestaurantOpenStatus(openingHours);

    return {
      id: restaurantId,
      name,
      plan: savedMockRestaurant?.plan || (isPremium ? 'premium' : 'free'),
      slug: restaurantId,
      phone,
      cep,
      address,
      number,
      neighborhood,
      city,
      state,
      image_url: logoUrl,
      cover_url: coverUrl,
      cover_image_url: coverUrl,
      logoUrl,
      addressSummary: `${address}, ${number || ''} - ${neighborhood || ''}, ${city} - ${state}`,
      followers_count: savedMockRestaurant?.followers_count || (isPremium ? 1250 : 340),
      payment_methods: paymentMethods,
      isOpen: openStatus.isOpen,
      statusText: openStatus.statusText,
      nextOpenTime: openStatus.nextOpenTime,
      is_favorite: false,
      email: savedMockRestaurant?.email || (isPremium ? 'teste@grubgo.com' : 'lancheira@free.com'),
      description: savedMockRestaurant?.description || (isPremium 
        ? 'Experiência gastronômica única com ingredientes selecionados e ambiente sofisticado.' 
        : 'Lanches rápidos e saborosos com aquele tempero caseiro que você adora.'),
      whatsapp_url: savedMockRestaurant?.whatsapp_url || null,
      ifood_url: savedMockRestaurant?.ifood_url || null,
      other_url: savedMockRestaurant?.other_url || null,
      other_url_label: savedMockRestaurant?.other_url_label || null,
      external_url: savedMockRestaurant?.external_url || null,
      social_networks: savedMockRestaurant?.social_networks || [],
      opening_hours: openingHours,
      gallery_images: savedMockRestaurant?.gallery_images || [
        { id: 'g1', image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600', caption: 'Pratos especiais', order_index: 0 },
        { id: 'g2', image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600', caption: 'Nosso ambiente', order_index: 1 },
        { id: 'g3', image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600', caption: 'Pizzas artesanais', order_index: 2 }
      ],
      menu_categories: savedMockRestaurant?.menu_categories || [
        {
          id: 'cat1',
          name: 'Mais Pedidos',
          order_index: 0,
          is_active: true,
          menu_items: [
            { id: 'item1', name: 'Filé Mignon ao Molho Madeira', description: 'Grelhado na brasa, servido com arroz biro-biro e batatas rústicas.', price: 79.9, image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300', order_index: 0, is_active: true },
            { id: 'item2', name: 'Salmão Grelhado com Alcaparras', description: 'Acompanha purê de mandioquinha e legumes grelhados no azeite.', price: 68.5, image_url: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=300', order_index: 1, is_active: true }
          ]
        },
        {
          id: 'cat2',
          name: 'Bebidas',
          order_index: 1,
          is_active: true,
          menu_items: [
            { id: 'item3', name: 'Suco Natural de Laranja', description: 'Copo de 400ml, 100% natural sem adição de água.', price: 10.0, image_url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300', order_index: 0, is_active: true },
            { id: 'item4', name: 'Refrigerante Lata', description: 'Coca-Cola, Guaraná ou Sprite 350ml.', price: 6.5, image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300', order_index: 1, is_active: true }
          ]
        }
      ]
    } as unknown as PublicRestaurantData;
  }

  // 1. Buscar dados básicos do restaurante
  const { data: baseData, error: baseError } = await supabase
    .from('restaurants')
    .select(PUBLIC_RESTAURANT_BASE_SELECT)
    .eq('id', restaurantId)
    .or('is_deleted.eq.false,is_deleted.is.null')
    .maybeSingle();

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

  if (baseData.visit_status !== 'Visitado') {
    console.log(`[fetchPublicRestaurantById] Restaurant is not validated: ${restaurantId}.`);
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