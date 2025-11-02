import { supabase } from './client';
import { PublicRestaurantData, Restaurant, RestaurantPlan, MenuCategory, MenuItem, GalleryImage } from '@/types/restaurant';
import { WeekSchedule, DaySchedule } from '@/types/schedule'; // Importar WeekSchedule do novo arquivo
import { getRestaurantOpenStatus } from '@/lib/schedule'; // Certifique-se de que esta função está correta

export async function getPublicRestaurantById(restaurantId: string): Promise<PublicRestaurantData | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select(
      `
      *,
      menu_categories (
        id,
        name,
        order_index,
        is_active,
        is_popular,
        menu_items (
          id,
          name,
          description,
          price,
          image_url,
          order_index,
          is_active
        )
      ),
      restaurant_gallery (
        id,
        image_url,
        caption,
        order_index
      )
      `
    )
    .eq('id', restaurantId)
    .single();

  if (error) {
    console.error('Error fetching public restaurant:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Mapear os dados para o tipo PublicRestaurantData
  const publicRestaurant: PublicRestaurantData = {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    description: data.description,
    image_url: data.image_url,
    cover_image_url: data.cover_image_url,
    plan: data.plan as RestaurantPlan,
    phone: data.phone,
    email: data.email,
    cnpj: data.cnpj,
    category: data.category,
    whatsapp_url: data.whatsapp_url,
    ifood_url: data.ifood_url,
    other_url: data.other_url,
    address: data.address,
    number: data.number,
    neighborhood: data.neighborhood,
    city: data.city,
    state: data.state,
    cep: data.cep,
    latitude: data.latitude,
    longitude: data.longitude,
    opening_hours: data.opening_hours as WeekSchedule | null,
    created_at: data.created_at,
    external_url: data.external_url,
    followers_override: data.followers_override,
    payment_methods: data.payment_methods,
    social_networks: data.social_networks as GalleryImage[] | null, // Cast para o tipo correto
    
    // Campos adicionais para PublicRestaurantData
    addressSummary: [data.address, data.number, data.city].filter(Boolean).join(', '),
    followers_count: data.followers_override || 0, // Usar followers_override se existir
    
    menu_categories: data.menu_categories ? data.menu_categories.map((cat: any) => ({
      id: cat.id,
      restaurant_id: data.id,
      name: cat.name,
      order_index: cat.order_index,
      is_active: cat.is_active,
      created_at: cat.created_at,
      is_popular: cat.is_popular,
      menu_items: cat.menu_items ? cat.menu_items.map((item: any) => ({
        id: item.id,
        category_id: item.category_id,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        order_index: item.order_index,
        is_active: item.is_active,
        created_at: item.created_at,
      })) : [],
    })) : [],
    gallery_images: data.restaurant_gallery ? data.restaurant_gallery.map((img: any) => ({
      id: img.id,
      restaurant_id: data.id,
      image_url: img.image_url,
      caption: img.caption,
      order_index: img.order_index,
      created_at: img.created_at, // Adicionar created_at se disponível no schema
    })) : [],
  };

  // Calcular status de abertura
  const openStatus = getRestaurantOpenStatus(publicRestaurant.opening_hours as WeekSchedule | null);
  publicRestaurant.isOpen = openStatus.isOpen;
  publicRestaurant.statusText = openStatus.statusText;

  return publicRestaurant;
}

export async function getRestaurantById(restaurantId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (error) {
    console.error('Error fetching restaurant:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    plan: data.plan as RestaurantPlan,
    opening_hours: data.opening_hours as WeekSchedule | null,
    social_networks: data.social_networks as SocialNetwork[] | null,
  };
}

export async function updateRestaurant(restaurantId: string, updates: Partial<Restaurant>): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', restaurantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating restaurant:', error);
    throw error;
  }

  return data ? {
    ...data,
    plan: data.plan as RestaurantPlan,
    opening_hours: data.opening_hours as WeekSchedule | null,
    social_networks: data.social_networks as SocialNetwork[] | null,
  } : null;
}