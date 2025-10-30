import React from 'react';
import { MenuCategory } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface RestaurantMenuProps {
  menuCategories: MenuCategory[];
}

const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ menuCategories }) => {
  if (menuCategories.length === 0) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#022D68]">Cardápio</h2>
      
      {menuCategories
        .filter(category => category.is_active)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        .map((category) => (
        <div key={category.id} className="space-y-4">
          <h3 className="text-2xl font-extrabold text-gray-800 border-b pb-2">{category.name}</h3>
          
          <div className="grid gap-4">
            {category.menu_items
              .filter(item => item.is_active)
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
              .map((item) => (
              <Card key={item.id} className="p-4 flex items-start space-x-4 shadow-sm hover:shadow-md transition-shadow">
                {item.image_url && (
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                  />
                )}
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-lg text-[#022D68]">{item.name}</h4>
                    <p className="font-bold text-lg text-green-600 ml-4">
                      R$ {item.price.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <Separator className="mt-6" />
        </div>
      ))}
    </div>
  );
};

export default RestaurantMenu;