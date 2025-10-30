import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, Utensils, Lock } from 'lucide-react';
import { usePublicMenu } from '@/hooks/usePublicMenu';
import MenuItemCard from './MenuItemCard';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { UsePublicMenuResult, PublicMenuCategory } from '@/types/menu'; // Corrected import

interface RestaurantMenuSectionProps {
  id: string;
  restaurantId: string;
  isPremium: boolean;
}

const RestaurantMenuSection: React.FC<RestaurantMenuSectionProps> = ({ id, restaurantId, isPremium }) => {
  // Tipando a desestruturação
  const { menu, isLoading, error } = usePublicMenu(restaurantId) as UsePublicMenuResult;

  if (isLoading) {
    return (
      <Card id={id} className="shadow-soft-md border-none rounded-xl p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        <p className="text-sm text-gray-500 mt-2">Carregando cardápio...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card id={id} className="shadow-soft-md border-none rounded-xl p-6 text-center bg-red-50 border-red-300">
        <AlertTriangle className="h-6 w-6 text-red-500 mx-auto" />
        <p className="text-sm text-red-700 mt-2">Falha ao carregar o cardápio.</p>
      </Card>
    );
  }

  // Filtrar categorias que não possuem itens
  const activeCategories = menu.filter(category => category.menu_items && category.menu_items.length > 0);

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
        {activeCategories.map((category: PublicMenuCategory) => (
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
      
      {/* O bloco de incentivo Premium foi removido daqui */}
    </Card>
  );
};

export default RestaurantMenuSection;