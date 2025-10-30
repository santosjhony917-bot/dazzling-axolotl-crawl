import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { showError, showSuccess } from 'react-hot-toast'; // Usando react-hot-toast

interface FollowTogglePayload {
  restaurantId: string;
  isCurrentlyFollowing: boolean;
}

const toggleFollowStatus = async ({ restaurantId, isCurrentlyFollowing }: FollowTogglePayload) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  if (isCurrentlyFollowing) {
    // Unfollow
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId);

    if (error) throw error;
  } else {
    // Follow (usando a tabela user_favorites para simular seguidores)
    const { error } = await supabase
      .from('user_favorites')
      .insert([{ user_id: user.id, restaurant_id: restaurantId }]);

    if (error) throw error;
  }
};

export function useRestaurantFollow(restaurantId: string, isCurrentlyFollowing: boolean) {
  const { isAuthenticated } = useAuthData();
  const queryClient = useQueryClient();

  const { mutate, isPending: isToggling } = useMutation({
    mutationFn: toggleFollowStatus,
    onSuccess: (_, variables) => {
      // Invalida as queries de favoritos e o perfil público para atualizar a contagem
      queryClient.invalidateQueries({ queryKey: ['publicRestaurant', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      
      if (variables.isCurrentlyFollowing) {
        showSuccess("Deixou de seguir.");
      } else {
        showSuccess("Agora você está seguindo!");
      }
    },
    onError: (error) => {
      console.error("Follow toggle failed:", error);
      showError(error.message || "Falha ao atualizar status de seguidor.");
    },
  });

  const handleToggle = () => {
    if (!isAuthenticated) {
      showError("Você precisa estar logado para seguir um restaurante.");
      return;
    }
    mutate({ restaurantId, isCurrentlyFollowing });
  };

  return { 
    toggleFollow: handleToggle, 
    isToggling,
    isFollowing: isCurrentlyFollowing,
  };
}