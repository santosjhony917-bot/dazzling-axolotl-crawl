"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PopularDish {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_name: string;
}

export const usePopularDishes = () => {
  const [dishes, setDishes] = useState<PopularDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPopularDishes = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select(`
            id,
            name,
            description,
            price,
            image_url,
            menu_categories!inner(name, is_popular)
          `)
          .eq('menu_categories.is_popular', true)
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        if (error) {
          throw error;
        }

        const formattedData: PopularDish[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          image_url: item.image_url,
          category_name: item.menu_categories.name,
        }));

        setDishes(formattedData);
      } catch (err: any) {
        console.error('Error fetching popular dishes:', err.message);
        setError('Falha ao carregar pratos populares.');
      } finally {
        setLoading(false);
      }
    };

    fetchPopularDishes();
  }, []);

  return { dishes, loading, error };
};