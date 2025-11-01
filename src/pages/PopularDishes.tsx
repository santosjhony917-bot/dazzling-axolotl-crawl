"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client'; // Corrected import path
import MenuItemCard from '../components/MenuItemCard'; // Corrected import path
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

const PopularDishes: React.FC = () => {
  const { data: popularDishes, isLoading, isError } = useQuery({
    queryKey: ['allPopularDishes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_menu_items', {
        search_query: null,
        p_limit: 50, // Fetch more items for the dedicated page
      });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-[#022D68]">Pratos Populares</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-full h-[280px] bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
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
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ChevronLeft className="h-6 w-6" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-[#022D68] ml-2">Pratos Populares</h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {popularDishes.map((item) => (
          <MenuItemCard key={item.item_id} item={item} />
        ))}
      </div>
    </div>
  );
};

export default PopularDishes;