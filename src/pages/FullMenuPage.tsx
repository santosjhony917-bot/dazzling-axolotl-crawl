"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData } from '@/types/restaurant';
import RestaurantMenu from '@/components/public/RestaurantMenu';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PublicMenuCategory } from '@/types/menu'; // Importando PublicMenuCategory

const FullMenuPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<PublicRestaurantData | null>(null);

  const { data, isLoading, error } = useQuery<PublicRestaurantData>({
    queryKey: ['restaurantFullMenu', restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        throw new Error('Restaurant ID is missing');
      }

      const { data, error } = await supabase
        .from('restaurants')
        .select(
          `
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
          )
          `
        )
        .eq('id', restaurantId)
        .single();

      if (error) {
        throw error;
      }

      // Adiciona um cast para PublicRestaurantData, assumindo que a estrutura é compatível
      return data as PublicRestaurantData;
    },
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (data) {
      setRestaurant(data);
    }
    if (error) {
      toast.error('Erro ao carregar o cardápio completo.');
      console.error('Error fetching full menu:', error);
    }
  }, [data, error]);

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Carregando cardápio...</div>;
  }

  if (!restaurant) {
    return <div className="container mx-auto p-4 text-center">Restaurante não encontrado ou cardápio indisponível.</div>;
  }

  const hasMenu = restaurant.menu_categories && restaurant.menu_categories.length > 0;

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold">Cardápio Completo de {restaurant.name}</h1>
      </div>

      {hasMenu ? (
        <RestaurantMenu
          menuCategories={restaurant.menu_categories as PublicMenuCategory[]} // Cast para o tipo correto
          isFullMenuPage={true}
          restaurantId={restaurant.id} // Adicionado a prop restaurantId
        />
      ) : (
        <p className="text-center text-gray-600">Nenhum item de cardápio disponível.</p>
      )}
    </div>
  );
};

export default FullMenuPage;