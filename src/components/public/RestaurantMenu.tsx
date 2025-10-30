import React from 'react';
import { MenuCategory, MenuItem } from '@/types/restaurant'; // Importando MenuCategory e MenuItem do tipo estendido
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/lib/utils'; // Adicionando formatPrice
import { ChevronRight, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

// Definindo o tipo de categoria esperado (com itens aninhados)
interface MenuCategoryWithItems extends MenuCategory {
  menu_items: MenuItem[];
}

interface RestaurantMenuProps {
  menuCategories: MenuCategoryWithItems[];
}

const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ menuCategories }) => {
  const navigate = useNavigate();
  
  if (menuCategories.length === 0) return null;

  const handleItemClick = (itemId: string) => {
    navigate(createPageUrl('menuItemDetails', { itemId }));
  };

  return (
    <div id="menu" className="space-y-6">
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
              <Card 
                key={item.id} 
                className="p-4 flex items-start space-x-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleItemClick(item.id)}
              >
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
                    <p className="font-bold text-lg text-highlight ml-4">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
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