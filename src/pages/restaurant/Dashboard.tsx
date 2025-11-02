import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import HighlightCard from '@/components/restaurant/dashboard/HighlightCard';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_active: boolean;
  category_id: string;
  menu_categories: {
    is_active: boolean;
    is_popular: boolean;
  };
}

const Dashboard = () => {
  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPopularItems = async () => {
      setLoading(true);
      const { data: menuItems, error: itemsError } = await supabase
        .from('menu_items')
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          is_active,
          category_id,
          menu_categories (is_active, is_popular)
        `)
        .eq('is_active', true) // Filtra apenas itens de menu ativos
        .order('order_index', { ascending: true });

      if (itemsError) {
        setError(itemsError.message);
        setLoading(false);
        return;
      }

      // Filtra ainda mais para garantir que a categoria também esteja ativa e seja popular
      const filteredItems = menuItems.filter(item =>
        item.menu_categories && item.menu_categories.is_active && item.menu_categories.is_popular
      );

      setPopularItems(filteredItems);
      setLoading(false);
    };

    fetchPopularItems();
  }, []);

  if (loading) return <div className="p-4 text-center">Carregando pratos populares...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Erro ao carregar pratos populares: {error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-[#022D68]">Pratos Populares</h2>
      {popularItems.length === 0 ? (
        <p className="text-gray-600">Nenhum prato popular ativo encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularItems.map((item) => (
            <HighlightCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;