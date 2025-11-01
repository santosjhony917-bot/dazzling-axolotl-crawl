"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MenuItemCard from './MenuItemCard';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface PopularDishesCarouselProps {
  limit?: number;
}

const PopularDishesCarousel: React.FC<PopularDishesCarouselProps> = ({ limit = 10 }) => {
  const { data: popularDishes, isLoading, isError } = useQuery({
    queryKey: ['popularDishes', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_menu_items', {
        search_query: null, // No specific search query, just get popular
        p_limit: limit,
      });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex space-x-4 overflow-hidden p-4">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="w-[250px] h-[280px] bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <div className="text-red-500 text-center p-4">Erro ao carregar pratos populares.</div>;
  }

  if (!popularDishes || popularDishes.length === 0) {
    return <div className="text-gray-500 text-center p-4">Nenhum prato popular encontrado.</div>;
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md">
      <div className="flex w-max space-x-4 p-4">
        {popularDishes.map((item) => (
          <MenuItemCard key={item.item_id} item={item} />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default PopularDishesCarousel;