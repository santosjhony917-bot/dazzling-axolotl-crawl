import React from 'react';
import { PublicRestaurantData } from '@/pages/RestaurantProfilePublic';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MenuSectionProps {
  restaurant: PublicRestaurantData;
  isPremium: boolean;
}

const MenuSection: React.FC<MenuSectionProps> = ({ restaurant }) => {
  const activeCategories = restaurant.menu_categories?.filter(cat => cat.is_active) || [];

  if (activeCategories.length === 0) {
    return (
      <section className="py-6">
        <h2 className="text-2xl font-bold mb-4">Cardápio</h2>
        <p className="text-gray-600">Nenhum item de cardápio disponível no momento.</p>
      </section>
    );
  }

  return (
    <section className="py-6">
      <h2 className="text-2xl font-bold mb-4">Cardápio</h2>
      {activeCategories.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map((category) => (
        <div key={category.id} className="mb-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            {category.name}
            {category.is_popular && <Badge variant="secondary" className="ml-2 bg-yellow-400 text-yellow-900">Popular</Badge>}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {category.menu_items
              ?.filter(item => item.is_active)
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
              .map((item) => (
                <Card key={item.id} className="flex">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover rounded-l-lg" />
                  )}
                  <CardContent className="flex-grow p-4">
                    <CardTitle className="text-lg font-bold">{item.name}</CardTitle>
                    {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                    <p className="text-md font-semibold text-primary mt-2">
                      R$ {item.price.toFixed(2).replace('.', ',')}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
          <Separator className="my-6" />
        </div>
      ))}
    </section>
  );
};

export default MenuSection;