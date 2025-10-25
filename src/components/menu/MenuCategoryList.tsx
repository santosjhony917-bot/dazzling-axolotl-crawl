import React from 'react';
import { MenuCategory, MenuItem } from '@/types/menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Utensils, ChevronDown } from 'lucide-react';

interface MenuCategoryListProps {
  categories: (MenuCategory & { items: MenuItem[] })[];
}

const PublicMenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => (
  <div className="flex justify-between items-start p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
    <div className="flex-1 pr-4">
      <h4 className="font-semibold text-gray-900 dark:text-white">{item.name}</h4>
      {item.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
      )}
      <p className="text-base font-bold text-highlight mt-1">R$ {item.price.toFixed(2).replace('.', ',')}</p>
    </div>
    {item.image_url && (
      <img 
        src={item.image_url} 
        alt={item.name} 
        className="w-16 h-16 object-cover rounded-md flex-shrink-0"
      />
    )}
  </div>
);

const MenuCategoryList: React.FC<MenuCategoryListProps> = ({ categories }) => {
  // CORREÇÃO: Garante que category.items é um array antes de chamar .some()
  const activeCategories = categories.filter(c => c.is_active && (c.items || []).some(i => i.is_active));

  if (activeCategories.length === 0) {
    return (
      <div className="text-center text-gray-500 p-10 border border-dashed rounded-lg">
        O cardápio está vazio ou todos os itens estão inativos.
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full space-y-4">
      {activeCategories.map(category => (
        <Card key={category.id} className="shadow-md border-none">
          <AccordionItem value={category.id} className="border-b-0">
            <AccordionTrigger className="flex items-center justify-between p-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Utensils className="w-5 h-5 text-primary" />
                <span className="font-bold text-lg text-primary">{category.name}</span>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-gray-500" />
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {(category.items || []).filter(i => i.is_active).map(item => (
                  <PublicMenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Card>
      ))}
    </Accordion>
  );
};

export default MenuCategoryList;