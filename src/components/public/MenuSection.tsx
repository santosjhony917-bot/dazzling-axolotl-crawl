import React from 'react';
import { MenuCategoryWithItems } from '@/types/restaurant';
import { Separator } from '@/components/ui/separator';
import MenuItemCard from '../MenuItemCard';

interface MenuSectionProps {
  menuCategories: MenuCategoryWithItems[];
  restaurantId: string;
  isOwner: boolean;
}

const MenuSection: React.FC<MenuSectionProps> = ({ menuCategories, restaurantId, isOwner }) => {
  if (!menuCategories || menuCategories.length === 0) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Cardápio</h2>

      <div className="space-y-8">
        {menuCategories.filter(cat => cat.is_active || isOwner).map((category) => (
          <div key={category.id}>
            <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              {category.name}
              {isOwner && !category.is_active && (
                <span className="ml-2 text-sm font-normal text-red-500">(Inativo)</span>
              )}
            </h3>
            
            <div className="grid gap-4">
              {category.menu_items.filter(item => item.is_active || isOwner).map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  isOwner={isOwner}
                />
              ))}
            </div>
            
            {category.menu_items.length === 0 && isOwner && (
              <p className="text-gray-500 italic">Nenhum item neste categoria.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuSection;