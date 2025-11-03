"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData } from '@/types/restaurant';
import { FreeProfileLayout } from '@/components/public/FreeProfileLayout'; // Ajustado para importação nomeada
import { PremiumProfileLayout } from '@/components/public/PremiumProfileLayout'; // Ajustado para importação nomeada
import { showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

const RestaurantProfilePublic = () => {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<PublicRestaurantData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) {
        showError("ID do restaurante não fornecido.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          menu_categories (
            id,
            name,
            is_active,
            order_index,
            menu_items (
              id,
              name,
              description,
              price,
              image_url,
              is_active,
              order_index
            )
          ),
          restaurant_gallery (
            id,
            image_url,
            caption,
            order_index
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        showError("Erro ao carregar restaurante: " + error.message);
        console.error("Erro ao carregar restaurante:", error);
      } else {
        setRestaurant(data);
      }
      setLoading(false);
    };

    fetchRestaurant();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return <div className="text-center text-gray-500 mt-8">Restaurante não encontrado.</div>;
  }

  // Renderiza o layout apropriado com base no plano do restaurante
  if (restaurant.plan === 'premium') {
    return <PremiumProfileLayout />;
  } else {
    return <FreeProfileLayout />;
  }
};

export default RestaurantProfilePublic;