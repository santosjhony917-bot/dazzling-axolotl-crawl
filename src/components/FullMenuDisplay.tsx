"use client";

import React from 'react';
import { MenuCategoryWithItems, MenuItem } from '@/types/supabase'; // Importando tipos corretos
import { Card } from '@/components/ui/card';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface FullMenuDisplayProps {
  menuCategories: MenuCategoryWithItems[];
}

const FullMenuDisplay: React.FC<FullMenuDisplayProps> = ({ menuCategories }) => {
  if (!menuCategories || menuCategories.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>Nenhum item de menu disponível no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {menuCategories.filter(category => category.is_active).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map(category => (
        <div key={category.id} className="space-y-4">
          <h2 className="text-2xl font-bold text-[#022D68] border-b pb-2">{category.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.menu_items.filter(item => item.is_active).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map(item => (
              <Card key={item.id} className="flex flex-col overflow-hidden">
                <img
                  src={item.image_url || PLACEHOLDER_IMAGE_URL}
                  alt={item.name}
                  className="w-full h-40 object-cover"
                />
                <div className="p-4 flex-grow">
                  <h3 className="font-semibold text-lg text-[#022D68]">{item.name}</h3>
                  {item.description && <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>}
                  <p className="text-md font-bold text-[#E47948] mt-2">R$ {item.price.toFixed(2)}</p>
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