import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData, Restaurant, MenuCategoryWithItems, GalleryImage, SocialNetworkLink, RestaurantPlan } from '@/types/restaurant';
import { getRestaurantOpenStatus, processSchedule } from '@/lib/schedule';
import { DBWeekSchedule } from '@/types/schedule';

// Helper function to fetch related data
async function fetchRelatedData(restaurantId: string): Promise<{
  menu_categories: MenuCategoryWithItems[] | null;
  gallery_images: GalleryImage[] | null;
}> {
  const [menuResponse, galleryResponse] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('*, menu_items(*)')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true })
      .order('order_index', { foreignTable: 'menu_items', ascending: true }),

    supabase
      .from('restaurant_gallery')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true }),
  ]);

  const menu_categories = menuResponse.data as MenuCategoryWithItems[] | null;
  const gallery_images = galleryResponse.data as GalleryImage[] | null;

  return { menu_categories, gallery_images };
}

// Helper function to calculate followers count
async function fetchFollowersCount(restaurantId: string): Promise<number> {
  const { data, error } = await supabase.rpc('count_restaurant_followers', { p_restaurant_id: restaurantId });
  if (error) {
    console.error('Error fetching followers count:', error);
    return 0;
  }
  return data || 0;
}

// Helper function to check if the user favorited the restaurant
async function checkIsFavorite(restaurantId: string, userId: string | undefined): Promise<boolean> {
  if (!userId) return false;

  const { count, error } = await supabase
    .from('user_favorites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId);

  if (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
  return (count || 0) > 0;
}

/**
 * Fetches public data for a single restaurant, including computed fields and related data.
 */
export async function fetchPublicRestaurantData(
  restaurantId: string,
  userId: string | undefined
): Promise<PublicRestaurantData | null> {
  const { data: restaurantData, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (error || !restaurantData) {
    console.error('Error fetching restaurant data:', error);
    return null;
  }

  const baseData = restaurantData as Restaurant;

  // Fetch computed/related data concurrently
  const [
    { menu_categories, gallery_images },
    followersCount,
    isFavorite,
  ] = await Promise.all([
    fetchRelatedData(restaurantId),
    fetchFollowersCount(restaurantId),
    checkIsFavorite(restaurantId, userId),
  ]);

  // Calculate status of opening hours
  // We cast opening_hours to DBWeekSchedule | null to ensure type compatibility with the utility function
  const openStatus = getRestaurantOpenStatus(baseData.opening_hours as DBWeekSchedule | null);

  // Combine all data into PublicRestaurantData structure
  const publicData: PublicRestaurantData = {
    ...baseData,
    // Computed fields
    addressSummary: baseData.city && baseData.state ? `${baseData.city}, ${baseData.state}` : baseData.address,
    followers_count: followersCount + (baseData.followers_override || 0),
    is_favorite: isFavorite,
    isOpen: openStatus.isOpen,
    statusText: openStatus.statusText,
    
    // Related data
    menu_categories: menu_categories,
    gallery_images: gallery_images,
    
    // Ensure payment_methods is treated as string[] if it's not null
    payment_methods: baseData.payment_methods ? (baseData.payment_methods as unknown as string[]) : null,
    
    // Ensure social_networks is treated as SocialNetworkLink[] if it's not null
    social_networks: baseData.social_networks ? (baseData.social_networks as unknown as SocialNetworkLink[]) : null,
  };

  return publicData;
}

/**
 * Toggles the favorite status of a restaurant for the current user.
 */
export async function toggleRestaurantFavorite(restaurantId: string, userId: string): Promise<boolean> {
  // Check if already favorited
  const { count, error: selectError } = await supabase
    .from('user_favorites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId);

  if (selectError) throw selectError;

  const isCurrentlyFavorite = (count || 0) > 0;

  if (isCurrentlyFavorite) {
    // Delete favorite
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId);

    if (error) throw error;
    return false; // Now unfavorited
  } else {
    // Insert favorite
    const { error } = await supabase
      .from('user_favorites')
      .insert({ user_id: userId, restaurant_id: restaurantId });

    if (error) throw error;
    return true; // Now favorited
  }
}