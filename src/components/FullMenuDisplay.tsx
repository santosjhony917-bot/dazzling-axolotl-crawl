import React from 'react';
import { MenuCategoryWithItems, MenuItem } from '@/types/supabase';
import { Card } from '@/components/ui/card';
import { Utensils, DollarSign } from 'lucide-react';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { formatPrice } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

interface FullMenuDisplayProps {
  menuCategories: MenuCategoryWithItems[];
  restaurantId: string;
}

const FullMenuDisplay: React.FC<FullMenuDisplayProps> = ({ menuCategories, restaurantId }) => {
  const navigate = useNavigate();

  const handleItemClick = (itemId: string) => {
    navigate(createPageUrl('menuItemDetails', { itemId }));
  };

  if (!menuCategories || menuCategories.length === 0) {
    return (
      <div className="text-center p-8 text-gray-600 bg-white rounded-xl shadow-soft-md">
        <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-xl font-semibold">Nenhum item no cardápio</p>
        <p className="mt-2">Este restaurante ainda não adicionou itens ao seu cardápio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {menuCategories.map((category) => (
        <div key={category.id} className="space-y-4">
          <h3 className="text-xl font-extrabold text-gray-800 border-b pb-2">{category.name}</h3>
          <div className="grid gap-4">
            {category.menu_items.map((item) => (
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
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FullMenuDisplay;