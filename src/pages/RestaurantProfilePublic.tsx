"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData, RestaurantPlan } from '@/types'; // Importar PublicRestaurantData e RestaurantPlan
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useScroll } from '@/hooks/useScroll'; // Importar useScroll

interface RestaurantProfilePublicProps {
  initialRestaurantId?: string; // Adicionado para simulação de planos
  simulatedPlan?: RestaurantPlan; // Adicionado para simulação de planos
}

const fetchRestaurantData = async (id: string, userId: string | undefined): Promise<PublicRestaurantData> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
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
      user_favorites!left(user_id)
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const restaurantData: PublicRestaurantData = {
    ...data,
    is_favorite: data.user_favorites.length > 0,
    followers_count: data.followers_override || 0, // Use followers_override if available
    menu_categories: data.menu_categories.filter((cat: any) => cat.is_active).sort((a: any, b: any) => a.order_index - b.order_index),
  };

  // Fetch actual follower count if not overridden
  if (!data.followers_override) {
    const { data: countData, error: countError } = await supabase.rpc('count_restaurant_followers', { p_restaurant_id: id });
    if (countError) {
      console.error('Error fetching follower count:', countError);
    } else {
      restaurantData.followers_count = countData;
    }
  }

  return restaurantData;
};

const RestaurantProfilePublic: React.FC<RestaurantProfilePublicProps> = ({ initialRestaurantId, simulatedPlan }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const restaurantId = initialRestaurantId || paramId; // Usar initialRestaurantId se fornecido, senão paramId

  const navigate = useNavigate();
  const { user } = useAuth();
  const { scrollY } = useScroll();

  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    setIsCompact(scrollY > 100); // Ajuste o limite conforme necessário
  }, [scrollY]);

  const { data: restaurant, isLoading, error, refetch } = useQuery<PublicRestaurantData, Error>(
    ['restaurantProfile', restaurantId, user?.id],
    ({ queryKey }) => fetchRestaurantData(queryKey[1] as string, queryKey[2] as string | undefined), // Corrigido para passar os argumentos corretamente
    {
      enabled: !!restaurantId,
      staleTime: 1000 * 60 * 5, // 5 minutos
    }
  );

  const toggleFollow = async () => {
    if (!user) {
      toast.info('Você precisa estar logado para seguir um restaurante.');
      navigate('/login');
      return;
    }

    if (!restaurant) return;

    const isCurrentlyFavorite = restaurant.is_favorite;
    const newFavoriteStatus = !isCurrentlyFavorite;

    // Otimistic update
    const previousRestaurant = { ...restaurant }; // Criar uma cópia para reverter
    restaurant.is_favorite = newFavoriteStatus;
    restaurant.followers_count += newFavoriteStatus ? 1 : -1;

    try {
      if (newFavoriteStatus) {
        const { error } = await supabase.from('user_favorites').insert({
          user_id: user.id,
          restaurant_id: restaurant.id,
        });
        if (error) throw error;
        toast.success('Restaurante seguido com sucesso!');
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('restaurant_id', restaurant.id);
        if (error) throw error;
        toast.info('Você deixou de seguir este restaurante.');
      }
      refetch(); // Refetch para garantir a consistência dos dados
    } catch (error: any) {
      toast.error(`Erro ao ${newFavoriteStatus ? 'seguir' : 'deixar de seguir'} o restaurante: ${error.message}`);
      // Reverter otimistic update em caso de erro
      Object.assign(restaurant, previousRestaurant); // Reverter para o estado anterior
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">Erro: {error.message}</div>;
  }

  if (!restaurant) {
    return <div className="flex justify-center items-center min-h-screen">Restaurante não encontrado.</div>;
  }

  const currentPlan = simulatedPlan || restaurant.plan; // Usar simulatedPlan se fornecido

  return (
    <div className="relative min-h-screen bg-background-light">
      <div className="max-w-md mx-auto">
        {currentPlan === 'premium' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <PremiumProfileLayout 
              restaurant={restaurant} 
              toggleFavorite={toggleFollow} 
              isFavoriteMutating={isLoading}
              isCompact={isCompact}
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <FreeProfileLayout 
              restaurant={restaurant} 
              toggleFavorite={toggleFollow} 
              isFavoriteMutating={isLoading}
              isCompact={isCompact}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default RestaurantProfilePublic;