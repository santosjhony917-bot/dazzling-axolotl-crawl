import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData } from '@/types/restaurant';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Heart } from 'lucide-react';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { useAuth } from '@/integrations/supabase/auth';
import toast from 'react-hot-toast';

// Tipagem para os dados do menu
interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  order_index: number;
}

interface MenuCategory {
  id: string;
  name: string;
  order_index: number;
  menu_items: MenuItem[];
}

// Função de busca de dados
const fetchRestaurantData = async (restaurantId: string, userId: string | null) => {
  // 1. Buscar dados do restaurante e menu
  const { data: restaurantData, error: restaurantError } = await supabase
    .from('restaurants')
    .select(`
      *,
      menu_categories (
        id,
        name,
        order_index,
        is_active,
        menu_items (
          id,
          name,
          description,
          price,
          image_url,
          order_index,
          is_active
        )
      )
    `)
    .eq('id', restaurantId)
    .single();

  if (restaurantError) throw new Error(restaurantError.message);

  // Filtrar categorias e itens inativos para o perfil público
  const activeMenuCategories = (restaurantData.menu_categories || [])
    .filter((cat: any) => cat.is_active)
    .map((cat: any) => ({
      ...cat,
      menu_items: (cat.menu_items || []).filter((item: any) => item.is_active),
    })) as MenuCategory[];

  const publicRestaurant: PublicRestaurantData = {
    ...restaurantData,
    menu_categories: activeMenuCategories,
  };

  // 2. Verificar se é favorito (apenas se houver usuário logado)
  let isFavorite = false;
  if (userId) {
    const { data: favoriteData, error: favoriteError } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (favoriteError && favoriteError.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error('Error fetching favorite status:', favoriteError);
    }
    isFavorite = !!favoriteData;
  }

  return { restaurant: publicRestaurant, menuCategories: activeMenuCategories, isFavorite };
};

const RestaurantProfilePublic: React.FC = () => {
  const { id: restaurantId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['restaurantProfile', restaurantId, user?.id],
    queryFn: () => fetchRestaurantData(restaurantId!, user?.id || null),
    enabled: !!restaurantId,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error('Você precisa estar logado para favoritar um restaurante.');
        return;
      }
      
      if (data?.isFavorite) {
        // Remover favorito
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('restaurant_id', restaurantId!);
        if (error) throw error;
      } else {
        // Adicionar favorito
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, restaurant_id: restaurantId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantProfile', restaurantId, user?.id] });
      toast.success(data?.isFavorite ? 'Removido dos favoritos!' : 'Adicionado aos favoritos!');
    },
    onError: (err) => {
      console.error('Favorite mutation error:', err);
      toast.error('Erro ao atualizar favoritos.');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Skeleton className="w-full h-64" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-12 max-w-3xl">
          <Skeleton className="h-24 w-full rounded-xl shadow-lg mb-8" />
          <div className="space-y-8">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-60 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.restaurant) {
    return (
      <div className="container mx-auto p-8 max-w-xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Não foi possível carregar o perfil do restaurante. Verifique o ID.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { restaurant, menuCategories, isFavorite } = data;

  const layoutProps = {
    restaurant,
    menuCategories,
    isFavorite,
    onToggleFavorite: toggleFavoriteMutation.mutate,
  };

  return (
    <>
      {restaurant.plan === 'premium' || restaurant.plan === 'premium_gift' ? (
        <PremiumProfileLayout {...layoutProps} />
      ) : (
        <FreeProfileLayout {...layoutProps} />
      )}
    </>
  );
};

export default RestaurantProfilePublic;