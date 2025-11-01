"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { MenuCategoryWithItems, MenuItem } from '@/types/supabase'; // Importando tipos corretos
import { useMenuItemFavorites } from '@/hooks/useMenuItemFavorites';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface RestaurantMenuProps {
  menuCategories: MenuCategoryWithItems[];
}

const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ menuCategories }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAllItems, setShowAllItems] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleShowAllItems = (categoryId: string) => {
    setShowAllItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const activeCategories = menuCategories
    .filter(category => category.is_active)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  if (activeCategories.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>Nenhum item de menu disponível no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {activeCategories.map(category => {
        const isExpanded = expandedCategories.has(category.id);
        const visibleItems = showAllItems.has(category.id) ? category.menu_items : category.menu_items.slice(0, 3);
        const remainingItemsCount = category.menu_items.length - visibleItems.length;

        return (
          <div key={category.id} className="space-y-4">
            {/* Título da Categoria */}
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleCategory(category.id)}>
              <h3 className="text-xl font-extrabold text-gray-800">{category.name}</h3>
              {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
            </div>

            {/* Itens do Menu */}
            {isExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleItems.filter(item => item.is_active).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map(item => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            )}

            {/* Botão "Ver mais" */}
            {isExpanded && remainingItemsCount > 0 && (
              <Button
                variant="ghost"
                className="w-full text-[#E47948] hover:text-[#C2653B]"
                onClick={() => toggleShowAllItems(category.id)}
              >
                Ver mais {remainingItemsCount} itens em {category.name}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface MenuItemCardProps {
  item: MenuItem;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  const { isFavorite, toggleFavorite } = useMenuItemFavorites(item.id);

  return (
    <div className="flex items-center bg-white rounded-lg shadow-sm p-4">
      <img
        src={item.image_url || PLACEHOLDER_IMAGE_URL}
        alt={item.name}
        className="w-24 h-24 object-cover rounded-md mr-4"
      />
      <div className="flex-grow">
        <h4 className="font-semibold text-lg text-[#022D68]">{item.name}</h4>
        {item.description && <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>}
        <p className="text-md font-bold text-[#E47948] mt-1">R$ {item.price.toFixed(2)}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={toggleFavorite} className="ml-4">
        <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
      </Button>
    </div>
  );
};

export default RestaurantMenu;