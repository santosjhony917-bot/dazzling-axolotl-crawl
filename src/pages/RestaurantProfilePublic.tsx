import { PublicRestaurantData } from '@/types/restaurant';
import { FreeProfileLayout } from '@/components/public/FreeProfileLayout'; // Corrigido para importação nomeada
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout'; // Corrigido para importação padrão
import { useUser } from '@/hooks/useUser'; // Corrigido para importação nomeada
import { useRestaurant } from '@/hooks/useRestaurant'; // Corrigido para importação nomeada
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const RestaurantProfilePublic = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const { data: restaurant, isLoading, error } = useRestaurant(id);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (user && restaurant) {
      checkIfFavorite();
    }
  }, [user, restaurant]);

  const checkIfFavorite = async () => {
    if (!user || !restaurant) return;
    const { data, error } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurant.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error checking favorite:', error);
      toast.error('Erro ao verificar favoritos.');
    }
    setIsFavorite(!!data);
  };

  const handleFavoriteToggle = async () => {
    if (!user || !restaurant) {
      toast.info('Faça login para adicionar aos favoritos.');
      return;
    }

    if (isFavorite) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurant.id);

      if (error) {
        console.error('Error removing favorite:', error);
        toast.error('Erro ao remover dos favoritos.');
      } else {
        setIsFavorite(false);
        toast.success('Removido dos favoritos!');
      }
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, restaurant_id: restaurant.id });

      if (error) {
        console.error('Error adding favorite:', error);
        toast.error('Erro ao adicionar aos favoritos.');
      } else {
        setIsFavorite(true);
        toast.success('Adicionado aos favoritos!');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        Erro ao carregar perfil do restaurante ou restaurante não encontrado.
      </div>
    );
  }

  // Determine if the restaurant has a gallery, menu, or reviews based on actual data
  const hasGallery = restaurant.restaurant_gallery && restaurant.restaurant_gallery.length > 0;
  const hasMenu = restaurant.menu_categories && restaurant.menu_categories.length > 0;
  const hasReviews = true; // Assuming all restaurants can have reviews

  if (restaurant.plan === 'premium') {
    return (
      <PremiumProfileLayout
        restaurant={restaurant}
        menuCategories={restaurant.menu_categories || []}
        menuItems={restaurant.menu_categories?.flatMap((cat: any) => cat.menu_items) || []}
        hasGallery={hasGallery}
        hasMenu={hasMenu}
        hasReviews={hasReviews}
        isFavorite={isFavorite}
        onFavoriteToggle={handleFavoriteToggle}
      />
    );
  } else {
    return (
      <FreeProfileLayout
        restaurant={restaurant}
        hasGallery={hasGallery}
        hasReviews={hasReviews}
        isFavorite={isFavorite}
        onFavoriteToggle={handleFavoriteToggle}
      />
    );
  }
};

export default RestaurantProfilePublic;