import { MenuItem, Restaurant, RestaurantWithDistance } from '@/types/supabase';
import { PublicRestaurantData } from '@/types/restaurant';
import { showError } from '@/utils/toast';
import {
  fetchNearbyPublicCatalogRestaurants,
  fetchPublicCatalogMenuItemBundle,
} from './publicCatalog';
import { fetchPublicRestaurantById as fetchPublicRestaurantProfileById } from './restaurants';

// Função para buscar um único item de menu por ID, incluindo dados do restaurante
export async function fetchMenuItemById(itemId: string): Promise<(MenuItem & { restaurant: Restaurant | null }) | null> {
  const bundle = await fetchPublicCatalogMenuItemBundle(itemId);
  if (!bundle) return null;

  type CatalogOption = (typeof bundle.options)[number];
  const optionsByGroup = new Map<string, CatalogOption[]>();
  const ungroupedOptions: CatalogOption[] = [];
  bundle.options.forEach((option) => {
    const groupId = typeof option.group_id === 'string' ? option.group_id : null;
    if (!groupId) {
      ungroupedOptions.push(option);
      return;
    }
    optionsByGroup.set(groupId, [...(optionsByGroup.get(groupId) || []), option]);
  });

  const optionGroups = bundle.optionGroups.map((group) => ({
    ...group,
    menu_item_options: optionsByGroup.get(String(group.id || '')) || [],
  }));
  if (optionGroups.length === 0 && ungroupedOptions.length > 0) {
    optionGroups.push({
      id: `ungrouped:${bundle.item.id}`,
      menu_item_id: bundle.item.id,
      name: 'Opções',
      menu_item_options: ungroupedOptions,
    });
  }

  return {
    ...bundle.item,
    menu_option_groups: optionGroups,
    restaurant: bundle.restaurant,
  } as unknown as MenuItem & { restaurant: Restaurant };
}

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

// Função para buscar um restaurante público por ID
export async function fetchPublicRestaurantById(restaurantId: string): Promise<PublicRestaurantData | null> {
  return fetchPublicRestaurantProfileById(restaurantId);
}
