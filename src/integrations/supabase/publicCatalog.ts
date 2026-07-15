import { supabase } from '@/integrations/supabase/client';
import type {
  GalleryImage,
  MenuCategory,
  MenuItem,
  MenuItemOption,
  MenuOptionGroup,
  MenuSection,
  Restaurant,
  RestaurantWithDistance,
} from '@/types/supabase';

type SupabaseReadError = {
  code?: string | null;
  message?: string | null;
};

type PublicCatalogRestaurant = Restaurant & {
  public_item_count?: number | null;
  menu_verified_at?: string | null;
};

type PublicCatalogMenuEntry = MenuItem & {
  restaurant_id: string;
  menu_verified_at?: string | null;
};

type PublicCatalogOptionGroup = MenuOptionGroup & {
  id: string;
  menu_item_id: string;
};

type PublicCatalogOption = MenuItemOption & {
  id: string;
  menu_item_id: string;
  group_id?: string | null;
};

export interface PublicCatalogBundle {
  restaurant: PublicCatalogRestaurant;
  sections: MenuSection[];
  categories: MenuCategory[];
  items: PublicCatalogMenuEntry[];
  optionGroups: PublicCatalogOptionGroup[];
  options: PublicCatalogOption[];
  gallery: GalleryImage[];
}

const PUBLIC_RESTAURANT_SELECT = [
  'id',
  'name',
  'description',
  'image_url',
  'cover_image_url',
  'category',
  'phone',
  'whatsapp_url',
  'ifood_url',
  'other_url',
  'other_url_label',
  'address',
  'number',
  'neighborhood',
  'city',
  'state',
  'cep',
  'latitude',
  'longitude',
  'opening_hours',
  'payment_methods',
  'social_networks',
  'plan',
  'public_item_count',
  'menu_verified_at',
].join(',');

const LEGACY_PUBLIC_RESTAURANT_SELECT = [
  'id',
  'name',
  'description',
  'image_url',
  'cover_image_url',
  'category',
  'phone',
  'whatsapp_url',
  'ifood_url',
  'other_url',
  'other_url_label',
  'address',
  'number',
  'neighborhood',
  'city',
  'state',
  'cep',
  'latitude',
  'longitude',
  'opening_hours',
  'payment_methods',
  'social_networks',
  'plan',
].join(',');

const PUBLIC_MENU_ENTRY_SELECT = [
  'id',
  'category_id',
  'restaurant_id',
  'name',
  'display_name',
  'search_display_name',
  'description',
  'price',
  'display_price',
  'price_type',
  'price_min',
  'price_max',
  'original_price',
  'promotional_price',
  'price_source',
  'source_url',
  'commercial_type',
  'is_configurable',
  'combo_components',
  'combo_rules',
  'combo_display_mode',
  'serves_count',
  'image_url',
  'order_index',
  'is_active',
  'is_illustrative',
  'created_at',
  'menu_verified_at',
].join(',');

const LEGACY_MENU_ENTRY_SELECT = [
  'id',
  'category_id',
  'name',
  'display_name',
  'search_display_name',
  'description',
  'price',
  'display_price',
  'price_type',
  'price_min',
  'price_max',
  'original_price',
  'promotional_price',
  'price_source',
  'source_url',
  'commercial_type',
  'is_configurable',
  'combo_components',
  'combo_rules',
  'combo_display_mode',
  'serves_count',
  'image_url',
  'order_index',
  'is_active',
  'is_illustrative',
  'needs_review',
  'created_at',
].join(',');

export function isMissingPublicCatalogContract(error: SupabaseReadError | null | undefined): boolean {
  if (!error) return false;
  if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(String(error.code || ''))) return true;
  const message = String(error.message || '');
  return /(?:relation|function) .* does not exist/i.test(message)
    || /could not find the (?:table|function).*schema cache/i.test(message);
}

function normalizeSearchTerm(value: string): string {
  return value.trim().replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').slice(0, 120);
}

async function fetchLegacyPublicRestaurants(options: {
  ids?: string[];
  nameQuery?: string;
  limit?: number;
}): Promise<PublicCatalogRestaurant[]> {
  let query = supabase
    .from('restaurants')
    .select(LEGACY_PUBLIC_RESTAURANT_SELECT)
    .eq('is_published', true)
    .eq('menu_status', 'found')
    .or('is_deleted.eq.false,is_deleted.is.null');

  if (options.ids?.length) query = query.in('id', options.ids);
  if (options.nameQuery) query = query.ilike('name', `%${normalizeSearchTerm(options.nameQuery)}%`);
  query = query.limit(Math.min(Math.max(options.limit ?? 100, 1), 100));

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as PublicCatalogRestaurant[];
}

async function fetchPublicCatalogRestaurants(options: {
  ids?: string[];
  nameQuery?: string;
  limit?: number;
}): Promise<PublicCatalogRestaurant[]> {
  let query = supabase
    .from('public_catalog_restaurants')
    .select(PUBLIC_RESTAURANT_SELECT);

  if (options.ids?.length) query = query.in('id', options.ids);
  if (options.nameQuery) query = query.ilike('name', `%${normalizeSearchTerm(options.nameQuery)}%`);
  query = query.limit(Math.min(Math.max(options.limit ?? 100, 1), 100));

  const { data, error } = await query;
  if (!error) return (data || []) as unknown as PublicCatalogRestaurant[];
  if (!isMissingPublicCatalogContract(error)) throw error;
  return fetchLegacyPublicRestaurants(options);
}

export async function fetchPublicCatalogRestaurantsByName(
  nameQuery: string,
  limit = 5,
): Promise<Restaurant[]> {
  if (!normalizeSearchTerm(nameQuery)) return [];
  return fetchPublicCatalogRestaurants({ nameQuery, limit });
}

export async function fetchPublicCatalogRestaurantsByIds(ids: string[]): Promise<Restaurant[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))].slice(0, 100);
  if (uniqueIds.length === 0) return [];
  return fetchPublicCatalogRestaurants({ ids: uniqueIds, limit: uniqueIds.length });
}

export async function fetchPublicCatalogRestaurantById(
  restaurantId: string,
): Promise<PublicCatalogRestaurant | null> {
  const rows = await fetchPublicCatalogRestaurants({ ids: [restaurantId], limit: 1 });
  return rows[0] ?? null;
}

export async function fetchNearbyPublicCatalogRestaurants(options: {
  latitude: number;
  longitude: number;
  maxDistanceKm?: number;
  searchQuery?: string | null;
  includedCategories?: string[];
  limit?: number;
  offset?: number;
}): Promise<RestaurantWithDistance[]> {
  const maxDistanceKm = Math.min(Math.max(options.maxDistanceKm ?? 10, 0.1), 50);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const offset = Math.min(Math.max(options.offset ?? 0, 0), 5000);
  const includedCategories = [...new Set((options.includedCategories || []).map(normalizeSearchTerm).filter(Boolean))].slice(0, 20);
  const searchQuery = options.searchQuery ? normalizeSearchTerm(options.searchQuery) : null;

  const response = await supabase.rpc('find_public_catalog_restaurants', {
    p_lat: options.latitude,
    p_lng: options.longitude,
    p_max_distance_km: maxDistanceKm,
    p_search_query: searchQuery,
    p_included_categories: includedCategories.length ? includedCategories : null,
    p_limit: limit,
    p_offset: offset,
  });

  if (!response.error) {
    return ((response.data || []) as Array<Record<string, unknown>>).map((row) => ({
      ...(row as unknown as Restaurant),
      distance_km: Number(row.distance_km),
    }));
  }
  if (!isMissingPublicCatalogContract(response.error)) throw response.error;

  const legacy = await supabase.rpc('find_nearby_restaurants', {
    user_lat: options.latitude,
    user_lng: options.longitude,
    max_distance_km: maxDistanceKm,
    search_query: searchQuery,
    included_categories: includedCategories.length ? includedCategories : null,
    p_limit: limit,
    p_offset: offset,
  });
  if (legacy.error) throw legacy.error;

  const legacyRows = (legacy.data || []) as Array<RestaurantWithDistance>;
  const eligibleRows = await fetchPublicCatalogRestaurantsByIds(legacyRows.map((row) => row.id));
  const eligibleById = new Map(eligibleRows.map((row) => [row.id, row]));
  return legacyRows.flatMap((row) => {
    const eligible = eligibleById.get(row.id);
    if (!eligible) return [];
    return [{ ...eligible, distance_km: Number(row.distance_km) } as RestaurantWithDistance];
  });
}

function hasPublicBasePrice(item: Record<string, unknown>): boolean {
  if (['free', 'included'].includes(String(item.price_type || ''))) return true;
  return ['promotional_price', 'display_price', 'price_min', 'price', 'price_max']
    .some((key) => item[key] !== null && item[key] !== undefined && Number.isFinite(Number(item[key])));
}

async function fetchPublicMenuEntriesByRestaurantIds(
  restaurantIds: string[],
  categoryIds: string[],
): Promise<PublicCatalogMenuEntry[]> {
  if (restaurantIds.length === 0 || categoryIds.length === 0) return [];

  const publicResult = await supabase
    .from('public_catalog_menu_entries')
    .select(PUBLIC_MENU_ENTRY_SELECT)
    .in('restaurant_id', restaurantIds)
    .order('order_index', { ascending: true });
  if (!publicResult.error) return (publicResult.data || []) as unknown as PublicCatalogMenuEntry[];
  if (!isMissingPublicCatalogContract(publicResult.error)) throw publicResult.error;

  const legacyResult = await supabase
    .from('menu_items')
    .select(LEGACY_MENU_ENTRY_SELECT)
    .in('category_id', categoryIds)
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  if (legacyResult.error) throw legacyResult.error;

  const categoryRestaurant = new Map<string, string>();
  const categoryRows = await fetchPublicCategories(restaurantIds);
  categoryRows.forEach((category) => categoryRestaurant.set(category.id, category.restaurant_id));
  return ((legacyResult.data || []) as unknown as Array<Record<string, unknown>>)
    .filter((item) => item.is_illustrative !== true)
    .filter((item) => item.needs_review !== true)
    .filter((item) => String(item.source_url || '').trim().length > 0)
    .filter(hasPublicBasePrice)
    .flatMap((item) => {
      const restaurantId = categoryRestaurant.get(String(item.category_id));
      if (!restaurantId) return [];
      return [{ ...item, restaurant_id: restaurantId } as unknown as PublicCatalogMenuEntry];
    });
}

export async function fetchPublicCatalogMenuEntriesByRestaurantIds(
  restaurantIds: string[],
): Promise<PublicCatalogMenuEntry[]> {
  const eligibleRestaurants = await fetchPublicCatalogRestaurantsByIds(restaurantIds);
  const eligibleIds = eligibleRestaurants.map((restaurant) => restaurant.id);
  if (eligibleIds.length === 0) return [];
  const categories = await fetchPublicCategories(eligibleIds);
  return fetchPublicMenuEntriesByRestaurantIds(
    eligibleIds,
    categories.map((category) => category.id),
  );
}

async function fetchPublicSections(restaurantIds: string[]): Promise<MenuSection[]> {
  const result = await supabase
    .from('public_catalog_menu_sections')
    .select('id,restaurant_id,name,order_index,created_at')
    .in('restaurant_id', restaurantIds)
    .order('order_index', { ascending: true });
  if (!result.error) return (result.data || []) as MenuSection[];
  if (!isMissingPublicCatalogContract(result.error)) throw result.error;

  const legacy = await supabase
    .from('menu_sections')
    .select('id,restaurant_id,name,order_index,created_at')
    .in('restaurant_id', restaurantIds)
    .order('order_index', { ascending: true });
  if (legacy.error) throw legacy.error;
  return (legacy.data || []) as MenuSection[];
}

async function fetchPublicCategories(restaurantIds: string[]): Promise<MenuCategory[]> {
  const result = await supabase
    .from('public_catalog_menu_categories')
    .select('id,restaurant_id,section_id,name,order_index,is_active,is_popular,created_at')
    .in('restaurant_id', restaurantIds)
    .order('order_index', { ascending: true });
  if (!result.error) return (result.data || []) as MenuCategory[];
  if (!isMissingPublicCatalogContract(result.error)) throw result.error;

  const legacy = await supabase
    .from('menu_categories')
    .select('id,restaurant_id,section_id,name,order_index,is_active,created_at')
    .in('restaurant_id', restaurantIds)
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  if (legacy.error) throw legacy.error;
  return (legacy.data || []) as MenuCategory[];
}

async function fetchPublicOptionGroups(itemIds: string[]): Promise<PublicCatalogOptionGroup[]> {
  if (itemIds.length === 0) return [];
  const select = 'id,menu_item_id,name,min_quantity,max_quantity,is_required,order_index,semantic_type,price_behavior,created_at';
  const result = await supabase
    .from('public_catalog_menu_option_groups')
    .select(select)
    .in('menu_item_id', itemIds)
    .order('order_index', { ascending: true });
  if (!result.error) return (result.data || []) as unknown as PublicCatalogOptionGroup[];
  if (!isMissingPublicCatalogContract(result.error)) throw result.error;

  const legacy = await supabase
    .from('menu_option_groups')
    .select(select)
    .in('menu_item_id', itemIds)
    .order('order_index', { ascending: true });
  if (legacy.error) throw legacy.error;
  return (legacy.data || []) as unknown as PublicCatalogOptionGroup[];
}

async function fetchPublicOptions(itemIds: string[]): Promise<PublicCatalogOption[]> {
  if (itemIds.length === 0) return [];
  const select = 'id,menu_item_id,group_id,group_name,name,description,price,price_delta,min_quantity,max_quantity,is_required,is_available,order_index,semantic_type,price_behavior,search_label,search_aliases,created_at';
  const result = await supabase
    .from('public_catalog_menu_item_options')
    .select(select)
    .in('menu_item_id', itemIds)
    .order('order_index', { ascending: true });
  if (!result.error) return (result.data || []) as unknown as PublicCatalogOption[];
  if (!isMissingPublicCatalogContract(result.error)) throw result.error;

  const legacy = await supabase
    .from('menu_item_options')
    .select(select)
    .in('menu_item_id', itemIds)
    .eq('is_available', true)
    .order('order_index', { ascending: true });
  if (legacy.error) throw legacy.error;
  return (legacy.data || []) as unknown as PublicCatalogOption[];
}

export async function fetchPublicCatalogGallery(restaurantId: string): Promise<GalleryImage[]> {
  const result = await supabase
    .from('public_catalog_gallery')
    .select('id,restaurant_id,image_url,caption,order_index,created_at')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });
  if (!result.error) return (result.data || []) as GalleryImage[];
  if (!isMissingPublicCatalogContract(result.error)) throw result.error;

  const restaurant = await fetchPublicCatalogRestaurantById(restaurantId);
  if (!restaurant) return [];
  const legacy = await supabase
    .from('restaurant_gallery')
    .select('id,restaurant_id,image_url,caption,order_index,created_at')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });
  if (legacy.error) throw legacy.error;
  return (legacy.data || []) as GalleryImage[];
}

export async function fetchPublicCatalogBundle(restaurantId: string): Promise<PublicCatalogBundle | null> {
  const restaurant = await fetchPublicCatalogRestaurantById(restaurantId);
  if (!restaurant) return null;

  const [sections, categories, gallery] = await Promise.all([
    fetchPublicSections([restaurantId]),
    fetchPublicCategories([restaurantId]),
    fetchPublicCatalogGallery(restaurantId),
  ]);
  const items = await fetchPublicMenuEntriesByRestaurantIds(
    [restaurantId],
    categories.map((category) => category.id),
  );
  const itemIds = items.map((item) => item.id);
  const [optionGroups, options] = await Promise.all([
    fetchPublicOptionGroups(itemIds),
    fetchPublicOptions(itemIds),
  ]);

  return { restaurant, sections, categories, items, optionGroups, options, gallery };
}

export async function fetchPublicCatalogMenuItemBundle(itemId: string): Promise<{
  item: PublicCatalogMenuEntry;
  restaurant: PublicCatalogRestaurant;
  optionGroups: PublicCatalogOptionGroup[];
  options: PublicCatalogOption[];
} | null> {
  const result = await supabase
    .from('public_catalog_menu_entries')
    .select(PUBLIC_MENU_ENTRY_SELECT)
    .eq('id', itemId)
    .maybeSingle();

  let item: PublicCatalogMenuEntry | null = null;
  if (!result.error) {
    item = result.data as unknown as PublicCatalogMenuEntry | null;
  } else if (isMissingPublicCatalogContract(result.error)) {
    const legacyItem = await supabase
      .from('menu_items')
      .select(LEGACY_MENU_ENTRY_SELECT)
      .eq('id', itemId)
      .eq('is_active', true)
      .maybeSingle();
    if (legacyItem.error) throw legacyItem.error;
    if (!legacyItem.data) return null;

    const legacyItemRow = legacyItem.data as unknown as Record<string, unknown>;
    const categoryId = String(legacyItemRow.category_id || '');
    if (!categoryId) return null;
    const category = await supabase
      .from('menu_categories')
      .select('id,restaurant_id,is_active')
      .eq('id', categoryId)
      .eq('is_active', true)
      .maybeSingle();
    if (category.error) throw category.error;
    if (!category.data) return null;

    const restaurant = await fetchPublicCatalogRestaurantById(category.data.restaurant_id);
    const rawItem = legacyItemRow;
    if (!restaurant
      || rawItem.is_illustrative === true
      || rawItem.needs_review === true
      || !String(rawItem.source_url || '').trim()
      || !hasPublicBasePrice(rawItem)) return null;
    item = { ...legacyItemRow, restaurant_id: restaurant.id } as unknown as PublicCatalogMenuEntry;
  } else {
    throw result.error;
  }

  if (!item) return null;
  const restaurant = await fetchPublicCatalogRestaurantById(item.restaurant_id);
  if (!restaurant) return null;
  const [optionGroups, options] = await Promise.all([
    fetchPublicOptionGroups([item.id]),
    fetchPublicOptions([item.id]),
  ]);
  return { item, restaurant, optionGroups, options };
}
