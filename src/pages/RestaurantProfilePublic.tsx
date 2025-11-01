import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PublicRestaurantData } from '@/types/restaurant';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/components/ui/use-toast';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

const RestaurantProfilePublic: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<PublicRestaurantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteMutating, setIsFavoriteMutating] = useState(false);

  const isOwner = user?.id === restaurant?.user_id;

  useEffect(() => {
    if (!slug) {
      setError('Slug do restaurante não fornecido.');
      setIsLoading(false);
      return;
    }

    const fetchRestaurant = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('restaurants')
        .select(
          `
            *,
            gallery:restaurant_gallery(*),
            menu_categories(
              *,
              menu_items(*)
            )
          `
        )
        .eq('external_url', slug)
        .single();

      if (error) {
        console.error('Error fetching restaurant:', error);
        setError('Não foi possível carregar o perfil do restaurante.');
        setRestaurant(null);
      } else if (data) {
        // Type casting the result to PublicRestaurantData
        setRestaurant(data as PublicRestaurantData);
      }
      setIsLoading(false);
    };

    fetchRestaurant();
  }, [slug]);

  // Favorite status logic (simplified for now)
  useEffect(() => {
    if (user && restaurant) {
      // Placeholder for fetching favorite status
      // In a real app, you would check the user_favorites table here
      setIsFavorite(false); 
    }
  }, [user, restaurant]);

  const toggleFavorite = async () => {
    if (!user || !restaurant || isFavoriteMutating) return;

    setIsFavoriteMutating(true);
    // Placeholder for API call to toggle favorite
    // This should interact with the user_favorites table
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    
    toast({
      title: newFavoriteState ? "Adicionado aos favoritos!" : "Removido dos favoritos.",
      description: `O restaurante ${restaurant.name} foi ${newFavoriteState ? 'adicionado' : 'removido'} da sua lista.`,
    });

    setIsFavoriteMutating(false);
  };

  if (isLoading || isUserLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!restaurant) {
    return <ErrorMessage message="Restaurante não encontrado." />;
  }

  const layoutProps = {
    restaurant,
    isOwner, // <-- Added isOwner here
    toggleFavorite,
    isFavoriteMutating,
  };

  return (
    <>
      {restaurant.plan === 'premium' || restaurant.plan === 'premium_gift' ? (
        <PremiumProfileLayout {...layoutProps} isOwner={isOwner} />
      ) : (
        <FreeProfileLayout {...layoutProps} isOwner={isOwner} />
      )}
    </>
  );
};

export default RestaurantProfilePublic;