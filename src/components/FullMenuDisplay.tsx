import React from 'react';
import { MenuCategory, MenuItem } from '@/hooks/useRestaurantMenu';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';

interface FullMenuDisplayProps {
  menu: MenuCategory[];
  loading: boolean;
}

const MenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      {item.image_url && (
        <img 
          src={item.image_url} 
          alt={item.name} 
          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
        />
      )}
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 dark:text-white leading-snug">{item.name}</h4>
        {item.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.description}</p>
        )}
        <p className="text-base font-bold text-highlight mt-1">{formatCurrency(item.price)}</p>
      </div>
    </div>
  );
};

const FullMenuDisplay: React.FC<FullMenuDisplayProps> = ({ menu, loading }) => {
  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Carregando cardápio...
      </div>
    );
  }

  if (menu.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Este restaurante ainda não possui itens ativos no cardápio.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {menu.map(category => (
        <Card key={category.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-primary dark:text-white text-xl font-bold leading-tight tracking-[-0.015em]">{category.name}</h3>
          </div>
          <div className="p-4 divide-y divide-gray-100 dark:divide-gray-700">
            {category.menu_items.map(item => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default FullMenuDisplay;