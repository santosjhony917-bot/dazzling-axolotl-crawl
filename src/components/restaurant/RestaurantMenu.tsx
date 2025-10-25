import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { MenuCategory, MenuItem } from '@/types/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RestaurantMenuProps {
  restaurantId: string;
}

interface MenuData {
  categories: MenuCategory[];
  items: MenuItem[];
}

const fetchMenu = async (restaurantId: string): Promise<MenuData> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*, menu_items(*)')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('order_index', { ascending: true })
    .order('order_index', { foreignTable: 'menu_items', ascending: true });

  if (error) throw new Error(error.message);

  const categories: MenuCategory[] = [];
  const items: MenuItem[] = [];

  data.forEach((categoryData: any) => {
    const { menu_items, ...category } = categoryData;
    categories.push(category as MenuCategory);
    if (menu_items) {
      items.push(...menu_items.filter((item: MenuItem) => item.is_active));
    }
  });

  return { categories, items };
};

const MenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => (
  <div className="flex items-start space-x-4 p-4 border-b last:border-b-0 dark:border-gray-700">
    {item.image_url && (
      <img
        src={item.image_url}
        alt={item.name}
        className="w-16 h-16 object-cover rounded-md flex-shrink-0"
      />
    )}
    <div className="flex-grow">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{item.name}</h4>
      {item.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
      )}
    </div>
    <p className="text-lg font-bold text-primary flex-shrink-0">
      R$ {item.price.toFixed(2).replace('.', ',')}
    </p>
  </div>
);

const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ restaurantId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['restaurantMenu', restaurantId],
    queryFn: () => fetchMenu(restaurantId),
    enabled: !!restaurantId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 dark:text-red-400">Erro ao carregar o cardápio: {error.message}</p>;
  }

  if (!data || data.categories.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">Cardápio não disponível.</p>;
  }

  return (
    <div className="space-y-8">
      {data.categories.map((category) => {
        const items = data.items.filter(item => item.category_id === category.id);
        
        if (items.length === 0) return null;

        return (
          <Card key={category.id} className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">{category.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RestaurantMenu;