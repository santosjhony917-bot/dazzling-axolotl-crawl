import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, Utensils, Lock } from 'lucide-react';
import MenuItemCard from './MenuItemCard';
import { PublicMenuCategory } from '@/types/menu';

interface RestaurantMenuProps {
  id: string;
  restaurantId: string;
  isPremium: boolean;
  menuCategories: PublicMenuCategory[]; // Recebe as categorias e itens diretamente do layout
}

const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ id, restaurantId, isPremium, menuCategories }) => {
  
  // Filtrar categorias que não possuem itens ativos
  const activeCategories = menuCategories.filter(category => category.menu_items && category.menu_items.length > 0);

  if (activeCategories.length === 0) {
    return (
      <Card id={id} className="shadow-soft-md border-none rounded-xl p-6 text-center bg-gray-50 border-dashed border-gray-300">
        <Utensils className="h-6 w-6 text-gray-400 mx-auto" />
        <p className="text-sm text-gray-600 mt-2">Este restaurante ainda não possui itens ativos no cardápio.</p>
      </Card>
    );
  }

  return (
    <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <Utensils className="w-6 h-6 text-primary" />
        <CardTitle className="text-xl font-semibold text-primary">Cardápio</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-8">
        {activeCategories.map(category => (
          <section key={category.id} className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-2">{category.name}</h3>
            
            <div className="space-y-4">
              {category.menu_items.map(item => (
                <MenuItemCard 
                  key={item.id} 
                  item={item} 
                  isPremium={isPremium}
                />
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
};

export default RestaurantMenu;