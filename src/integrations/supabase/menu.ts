import { supabase } from './client';
import { RestaurantMenuItem } from '@/types/menu';

/**
 * Calls the PostgreSQL function to search for menu items based on a text query.
 * @param searchQuery The text query to search for in item names and descriptions.
 * @returns A promise resolving to an array of RestaurantMenuItem.
 */
export async function searchMenuItems(searchQuery: string): Promise<RestaurantMenuItem[]> {
  const { data, error } = await supabase.rpc('search_menu_items', {
    search_query: searchQuery,
    p_limit: 50, // Limit results to 50
  });

  if (error) {
    console.error('Error calling search_menu_items:', error);
    throw new Error('Failed to search menu items.');
  }

  // The RPC returns data matching the RestaurantMenuItem structure defined in the SQL function.
  return data as RestaurantMenuItem[];
}