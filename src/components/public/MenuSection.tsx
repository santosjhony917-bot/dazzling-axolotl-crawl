import React from 'react';
import { Utensils, ChevronDown, ChevronUp } from 'lucide-react';
import { MenuCategory, MenuItem } from '@/types/supabase';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface MenuSectionData {
  categories: MenuCategory[];
  items: MenuItem[];
}

interface MenuSectionProps {
  menuData: MenuSectionData;
}

const MenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => (
  <div className="flex items-start space-x-4 py-3">
    {item.image_url && (
      <img 
        src={item.image_url} 
        alt={item.name} 
        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
      />
    )}
    <div className="flex-1 min-w-0">
      <h4 className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</h4>
      {item.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
      )}
      <p className="text-base font-bold text-highlight mt-1">{formatPrice(item.price)}</p>
    </div>
  </div>
);

const MenuSection: React.FC<MenuSectionProps> = ({ menuData }) => {
  const { categories, items } = menuData;

  // Agrupar itens por categoria
  const groupedItems = items.reduce((acc, item) => {
    if (item && item.is_active) { // Adicionando verificação de item
      if (!acc[item.category_id]) {
        acc[item.category_id] = [];
      }
      acc[item.category_id].push(item);
    }
    return acc;
  }, {} as Record<string, MenuItem[]>);

  // Filtrar categorias que têm itens ativos
  const activeCategories = categories.filter(cat => cat.is_active && groupedItems[cat.id]?.length > 0);

  if (activeCategories.length === 0) {
    return null; // Não renderiza a seção se não houver categorias ativas com itens
  }

  return (
    <section id="menu" className="p-4 pt-0">
      <Card className="shadow-lg border-none rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-extrabold text-primary flex items-center gap-2">
            <Utensils className="w-6 h-6" /> Cardápio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {activeCategories.map((category) => (
            <div key={category.id} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0 pb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">{category.name}</h3>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {groupedItems[category.id]?.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
};

export default MenuSection;