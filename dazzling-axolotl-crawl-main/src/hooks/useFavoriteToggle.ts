import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

const toggleFavoriteStatus = async (restaurantId: string, isCurrentlyFavorite: boolean) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  if (isCurrentlyFavorite) {
    // Remove favorite
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId);

    if (error) throw error;
  } else {
    // Add favorite
    const { error } = await supabase
      .from('user_favorites')
      .insert([{ user_id: user.id, restaurant_id: restaurantId }]);

    if (error) throw error;
  }
};

export const useFavoriteToggle = (restaurantId: string, isCurrentlyFavorite: boolean) => {
  const queryClient = useQueryClient();

  const { mutate, isPending: isToggling } = useMutation({
    mutationFn: () => toggleFavoriteStatus(restaurantId, isCurrentlyFavorite),
    onSuccess: () => {
      // Invalidate queries to refetch the restaurant data and update the favorite status
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['userFavorites'] });
      
      if (isCurrentlyFavorite) {
        toast.success("Removido dos favoritos.");
      } else {
        toast.success("Adicionado aos favoritos!");
      }
    },
    onError: (error) => {
      console.error("Favorite toggle failed:", error);
      toast.error(error.message || "Falha ao atualizar favoritos.");
    },
  });

  return { toggleFavorite: mutate, isToggling };
};