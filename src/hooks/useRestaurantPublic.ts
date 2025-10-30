import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData } from '@/types/restaurant';

const fetchRestaurantPublic = async (slug: string | undefined): Promise<PublicRestaurantData> => {
  if (!slug) {
    throw new Error("Slug do restaurante não fornecido.");
  }

  // Nota: Assumindo que existe uma view ou função que retorna todos os dados públicos
  // (incluindo menu, galeria, favoritos, etc.) para um slug.
  // Se não houver, esta query precisará ser mais complexa ou usar uma Edge Function.
  // Por enquanto, vamos buscar o restaurante principal e confiar que o tipo PublicRestaurantData
  // será preenchido por outras queries ou views no futuro.

  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      menu_categories (
        *,
        menu_items (*)
      ),
      restaurant_gallery (*),
      user_favorites (id)
    `)
    .eq('id', slug) // Assumindo que o slug é o ID por enquanto, ou que há uma coluna 'slug'
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Mapeamento básico para PublicRestaurantData (ajustar conforme a estrutura real do banco)
  const restaurantData: PublicRestaurantData = {
    ...data,
    is_favorite: data.user_favorites.length > 0,
    followers_count: 0, // Placeholder, deve ser buscado via RPC ou view
    addressSummary: `${data.address || ''}, ${data.city || ''}`,
    logoUrl: data.image_url,
    menu_categories: data.menu_categories || [],
    gallery_images: data.restaurant_gallery || [],
  } as PublicRestaurantData;

  return restaurantData;
};

export const useRestaurantPublic = (slug: string | undefined) => {
  return useQuery<PublicRestaurantData, Error>({
    queryKey: ['restaurantPublic', slug],
    queryFn: () => fetchRestaurantPublic(slug),
    enabled: !!slug,
  });
};