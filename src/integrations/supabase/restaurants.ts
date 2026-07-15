import { supabase } from '@/integrations/supabase/client';
import { RestaurantWithDistance } from '@/types/supabase';
import { PublicRestaurantData } from '@/types/restaurant';
import { showError } from '@/utils/toast';
import { getRestaurantOpenStatus } from '@/lib/schedule'; // Importando a nova função
import { WeekSchedule } from '@/types/schedule'; // Adicionado import para WeekSchedule
import { ALLOW_LOCAL_FIXTURES } from '@/lib/runtimeMode';
import {
  fetchNearbyPublicCatalogRestaurants,
  fetchPublicCatalogBundle,
} from '@/integrations/supabase/publicCatalog';

// Função para buscar restaurantes próximos (usando a função SQL find_nearby_restaurants)
export async function fetchNearbyRestaurants(
  lat: number, 
  lng: number, 
  maxDistance: number = 10, 
  searchQuery: string | null = null
): Promise<RestaurantWithDistance[]> {
  try {
    return await fetchNearbyPublicCatalogRestaurants({
      latitude: lat,
      longitude: lng,
      maxDistanceKm: maxDistance,
      searchQuery,
    });
  } catch (error) {
    console.error('Error fetching nearby public catalog restaurants:', error);
    showError('Erro ao buscar restaurantes próximos.');
    return [];
  }
}

/**
 * Busca os dados públicos de um restaurante pelo ID.
 * @param restaurantId O ID do restaurante.
 * @returns Os dados públicos do restaurante, incluindo menu e galeria.
 */
export async function fetchPublicRestaurantById(restaurantId: string): Promise<PublicRestaurantData | null> {
  console.log(`[fetchPublicRestaurantById] Attempting to fetch restaurant with ID: ${restaurantId}`);

  const isMockRestaurant = restaurantId && (restaurantId.startsWith('mock-') || restaurantId.startsWith('scraped-'));
  if (isMockRestaurant && !ALLOW_LOCAL_FIXTURES) return null;
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

  const bundle = await fetchPublicCatalogBundle(restaurantId);
  if (!bundle) return null;
  const baseData = bundle.restaurant;

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

  const [followersResult, isFavorite] = await Promise.all([
    supabase
      .from('user_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId),
    favoriteStatusPromise,
  ]);

  let followersCount = 0;
  if (followersResult.error) {
    console.warn(`[fetchPublicRestaurantById] Error fetching followers count for ${restaurantId}:`, followersResult.error);
  } else {
    followersCount += followersResult.count || 0;
  }

  const addressParts = [baseData.city, baseData.state].filter(Boolean);
  const addressSummary = addressParts.length > 0 ? addressParts.join(', ') : null;

  type CatalogOption = (typeof bundle.options)[number];
  type CatalogGroup = (typeof bundle.optionGroups)[number] & { menu_item_options: CatalogOption[] };
  const optionsByGroup = new Map<string, CatalogOption[]>();
  const ungroupedOptionsByItem = new Map<string, CatalogOption[]>();
  bundle.options.forEach((option) => {
    const groupId = typeof option.group_id === 'string' ? option.group_id : null;
    const itemId = String(option.menu_item_id || '');
    const target = groupId ? optionsByGroup : ungroupedOptionsByItem;
    const key = groupId || itemId;
    target.set(key, [...(target.get(key) || []), option]);
  });

  const groupsByItem = new Map<string, CatalogGroup[]>();
  bundle.optionGroups.forEach((group) => {
    const itemId = String(group.menu_item_id || '');
    const groupOptions = optionsByGroup.get(String(group.id || '')) || [];
    groupsByItem.set(itemId, [
      ...(groupsByItem.get(itemId) || []),
      { ...group, menu_item_options: groupOptions },
    ]);
  });

  const itemsByCategory = new Map<string, typeof bundle.items>();
  bundle.items.forEach((item) => {
    const groups = groupsByItem.get(item.id) || [];
    const ungrouped = ungroupedOptionsByItem.get(item.id) || [];
    const normalizedItem = {
      ...item,
      menu_option_groups: groups.length
        ? groups
        : ungrouped.length
          ? [{ id: `ungrouped:${item.id}`, menu_item_id: item.id, name: 'Opções', menu_item_options: ungrouped }]
          : [],
    };
    itemsByCategory.set(item.category_id, [
      ...(itemsByCategory.get(item.category_id) || []),
      normalizedItem,
    ]);
  });

  const filteredMenuCategories = bundle.categories
    .map((category) => ({
      ...category,
      menu_items: (itemsByCategory.get(category.id) || [])
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
    }))
    .filter((category) => category.menu_items.length > 0)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const openingHours = baseData.opening_hours as unknown as WeekSchedule | null;
  const openStatus = getRestaurantOpenStatus(openingHours);
  const paymentMethods = (baseData.payment_methods as string[] | null) || null;

  const result = {
    ...baseData,
    is_published: true,
    menu_status: 'found',
    email: null,
    external_url: null,
    addressSummary,
    logoUrl: baseData.image_url,
    followers_count: followersCount as number,
    menu_categories: filteredMenuCategories,
    menu_sections: bundle.sections,
    gallery_images: bundle.gallery,
    payment_methods: paymentMethods,
    opening_hours: openingHours,
    isOpen: openStatus.isOpen,
    statusText: openStatus.statusText,
    nextOpenTime: openStatus.nextOpenTime,
    is_favorite: isFavorite,
  } as unknown as PublicRestaurantData;

  console.log(`[fetchPublicRestaurantById] Returning restaurant data for ${restaurantId}.`);
  return result;
}

