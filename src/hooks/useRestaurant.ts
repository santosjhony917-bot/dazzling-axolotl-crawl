import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData, SupabaseRestaurantData } from '@/types'; // Importação correta

export const useRestaurant = (restaurantId: string | undefined) => {
  const [data, setData] = useState<PublicRestaurantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setIsLoading(false);
      return;
    }

    const fetchRestaurant = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('restaurants')
          .select(
            `
            *,
            restaurant_gallery (
              id, image_url, caption, order_index
            ),
            menu_categories (
              id, name, order_index, is_active, is_popular,
              menu_items (
                id, name, description, price, image_url, order_index, is_active
              )
            )
            `
          )
          .eq('id', restaurantId)
          .single();

        if (supabaseError) {
          throw supabaseError;
        }

        if (supabaseData) {
          // Cast para SupabaseRestaurantData para garantir a tipagem correta antes do mapeamento
          const rawData = supabaseData as SupabaseRestaurantData;

          const formattedData: PublicRestaurantData = {
            ...rawData,
            gallery_images: rawData.restaurant_gallery || [],
            is_favorite: false, // Valor padrão, será atualizado por RestaurantProfilePublic
            followers_count: 0, // Valor padrão
            addressSummary: '', // Valor padrão
            logoUrl: null, // Valor padrão
            isOpen: false, // Valor padrão
            statusText: '', // Valor padrão
            nextOpenTime: null, // Valor padrão
          };
          setData(formattedData);
        } else {
          setError(new Error("Restaurant not found."));
        }
      } catch (err) {
        console.error("Error fetching restaurant:", err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurant();
  }, [restaurantId]);

  return { data, isLoading, error };
};