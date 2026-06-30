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
  const ids = list.map((r: any) => r.id).filter(Boolean);
  const { data: menuStatusRows } = ids.length
    ? await supabase
      .from('restaurants')
      .select('id, menu_status')
      .in('id', ids)
    : { data: [] as any[] };
  const publishableMenuIds = new Set((menuStatusRows || [])
    .filter((row: any) => row.menu_status === 'found')
    .map((row: any) => row.id));
  return list.filter((r: any) => !deletedIds.has(r.id) && publishableMenuIds.has(r.id));
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

  const isMockRestaurant = restaurantId && (restaurantId.startsWith('mock-') || restaurantId.startsWith('scraped-'));
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(restaurantId || '');
  if (restaurantId && !isMockRestaurant && !isUuid) {
    console.warn(`[fetchPublicRestaurantById] Invalid restaurant ID: ${restaurantId}`);
    return null;
  }

  if (isMockRestaurant) {
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

    if (savedMockRestaurant && savedMockRestaurant.is_published && savedMockRestaurant.is_published !== true) {
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
      email: savedMockRestaurant?.email || (isPremium ? 'teste@filterfood.com' : 'lancheira@free.com'),
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

  if (baseData.is_published !== true || baseData.menu_status !== 'found') {
    console.log(`[fetchPublicRestaurantById] Restaurant is not publishable: ${restaurantId}.`);
    return null;
  }

  console.log(`[fetchPublicRestaurantById] Successfully fetched base data for ${restaurantId}.`);

  const favoriteStatusPromise = supabase.auth.getUser().then(async ({ data: userData }) => {
    if (!userData?.user) return false;

    const { data: favoriteData, error: favoriteError } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (favoriteError) {
      console.warn(`[fetchPublicRestaurantById] Error checking favorite status for ${restaurantId}:`, favoriteError);
      return false;
    }

    return !!favoriteData;
  });

  const [
    followersResult,
    galleryResult,
    sectionsResult,
    menuResult,
    isFavorite,
  ] = await Promise.all([
    supabase
      .from('user_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId),
    supabase
      .from('restaurant_gallery')
      .select('id, image_url, caption, order_index')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true }),
    supabase
      .from('menu_sections')
      .select('id, name, order_index, created_at')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true }),
    supabase
      .from('menu_categories')
      .select(`
        id, 
        name, 
        order_index, 
        is_active,
        section_id,
        menu_items(
            id, 
            name, 
            display_name,
            description, 
            price,
            display_price,
            price_type,
            price_min,
            price_max,
            commercial_type,
            is_configurable,
            search_display_name,
            search_keywords,
            combo_components,
            combo_rules,
            combo_display_mode,
            serves_count,
            raw_data,
            image_url, 
            order_index, 
            is_active,
            is_illustrative,
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
            )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true }),
    favoriteStatusPromise,
  ]);

  let followersCount = (baseData.followers_override || 0);
  if (followersResult.error) {
    console.warn(`[fetchPublicRestaurantById] Error fetching followers count for ${restaurantId}:`, followersResult.error);
  } else {
    followersCount += followersResult.count || 0;
  }

  let galleryImages: GalleryImage[] = [];
  if (galleryResult.error) {
    console.warn(`[fetchPublicRestaurantById] Error fetching gallery images for ${restaurantId}:`, galleryResult.error);
  } else {
    galleryImages = (galleryResult.data || []) as GalleryImage[];
  }

  let menuSections: any[] = [];
  if (sectionsResult.error) {
    console.warn(`[fetchPublicRestaurantById] Error fetching menu sections:`, sectionsResult.error);
  } else {
    menuSections = sectionsResult.data || [];
  }

  const menuData = menuResult.data;
  if (menuResult.error) {
    console.error(`[fetchPublicRestaurantById] Error fetching menu data for ${restaurantId}:`, menuResult.error);
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
    menu_sections: menuSections,
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

