import React from 'react';
import { MenuCategoryWithItems, MenuItem } from '@/types/supabase';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface FullMenuDisplayProps {
  menu: MenuCategoryWithItems[];
}

// O tipo MenuItem já é o correto após a correção em types/supabase.ts
const MenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => (
  <div className="flex gap-4 p-4 border-b last:border-b-0 dark:border-gray-700">
    <div className="flex-grow">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.name}</h3>
      {item.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
      )}
      <p className="text-base font-bold text-highlight dark:text-highlight-light mt-2">
        {formatPrice(item.price)}
      </p>
    </div>
    {item.image_url && (
      <img 
        src={item.image_url} 
        alt={item.name} 
        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
      />
    )}
  </div>
);

export default function FullMenuDisplay({ menu }: FullMenuDisplayProps) {
  if (!menu || menu.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        Nenhum item de menu encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {menu.map((category) => (
        <section key={category.id} className="scroll-mt-20" id={`category-${category.id}`}>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sticky top-0 bg-white dark:bg-gray-900 py-2 z-10 border-b dark:border-gray-700">
            {category.name}
          </h2>
          <Card className={cn(
            "bg-white dark:bg-gray-800 shadow-lg",
            category.menu_items.length > 0 ? "divide-y divide-gray-100 dark:divide-gray-700" : ""
          )}>
            {category.menu_items.length > 0 ? (
              category.menu_items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))
            ) : (
              <p className="p-4 text-gray-500 dark:text-gray-400 italic">Nenhum item nesta categoria.</p>
            )}
          </Card>
        </section>
      ))}
    </div>
  );
}