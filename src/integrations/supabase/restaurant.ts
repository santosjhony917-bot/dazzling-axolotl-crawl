import { supabase } from './client';
import { MenuCategory, MenuItem, Restaurant, RestaurantGalleryImage } from '@/types/restaurant';

// --- Fetching Data ---

export async function getRestaurantMenu(): Promise<{ categories: MenuCategory[], items: MenuItem[] }> {
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('menu_categories')
    .select('*')
    .order('order_index', { ascending: true });

  if (categoriesError) throw new Error(categoriesError.message);

  const categoryIds = categoriesData.map(c => c.id);

  const { data: itemsData, error: itemsError } = await supabase
    .from('menu_items')
    .select('*')
    .in('category_id', categoryIds)
    .order('order_index', { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  return {
    categories: categoriesData,
    items: itemsData,
  };
}

export async function getRestaurantProfile(): Promise<Restaurant> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .limit(1)
    .single();

  if (error) throw new Error(error.message);
  return data as Restaurant;
}

export async function getRestaurantGallery(restaurantId: string): Promise<RestaurantGalleryImage[]> {
  const { data, error } = await supabase
    .from('restaurant_gallery')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(error.message);
  return data as RestaurantGalleryImage[];
}

// --- Mutations ---

export async function saveCategory(category: Partial<MenuCategory>): Promise<MenuCategory> {
  if (category.id) {
    // Update existing category
    const { data, error } = await supabase
      .from('menu_categories')
      .update({ name: category.name, is_active: category.is_active })
      .eq('id', category.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as MenuCategory;
  } else {
    // Insert new category
    const { data, error } = await supabase
      .from('menu_categories')
      .insert({ name: category.name, restaurant_id: category.restaurant_id, is_active: category.is_active })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as MenuCategory;
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', categoryId);

  if (error) throw new Error(error.message);
}

export async function saveMenuItem(item: Partial<MenuItem>): Promise<MenuItem> {
  if (item.id) {
    // Update existing item
    const { data, error } = await supabase
      .from('menu_items')
      .update({
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        is_active: item.is_active,
      })
      .eq('id', item.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as MenuItem;
  } else {
    // Insert new item
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        category_id: item.category_id,
        is_active: item.is_active,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as MenuItem;
  }
}

export async function deleteMenuItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(error.message);
}

export async function swapCategoryOrder(category_id_a: string, category_id_b: string): Promise<void> {
  const { error } = await supabase.rpc('swap_category_order', { category_id_a, category_id_b });

  if (error) {
    console.error("Error swapping category order:", error);
    throw new Error(`Failed to reorder categories: ${error.message}`);
  }
}

export async function updateRestaurantProfile(restaurant: Partial<Restaurant>): Promise<Restaurant> {
  const { data, error } = await supabase
    .from('restaurants')
    .update(restaurant)
    .eq('id', restaurant.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Restaurant;
}

export async function saveGalleryImage(image: Partial<RestaurantGalleryImage>): Promise<RestaurantGalleryImage> {
  if (image.id) {
    // Update existing image
    const { data, error } = await supabase
      .from('restaurant_gallery')
      .update({ caption: image.caption, order_index: image.order_index })
      .eq('id', image.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as RestaurantGalleryImage;
  } else {
    // Insert new image
    const { data, error } = await supabase
      .from('restaurant_gallery')
      .insert({
        restaurant_id: image.restaurant_id,
        image_url: image.image_url,
        caption: image.caption,
        order_index: image.order_index,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as RestaurantGalleryImage;
  }
}

export async function deleteGalleryImage(imageId: string): Promise<void> {
  const { error } = await supabase
    .from('restaurant_gallery')
    .delete()
    .eq('id', imageId);

  if (error) throw new Error(error.message);
}