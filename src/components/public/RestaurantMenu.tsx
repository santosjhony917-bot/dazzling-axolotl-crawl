"use client";

import React, { useState } from 'react';
import { MenuCategoryWithItems, MenuItem } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatPrice } from '@/utils/formatters';

interface RestaurantMenuProps {
  menuCategories: MenuCategoryWithItems[] | null;
  isFullMenuPage: boolean;
}

const MAX_ITEMS_PER_CATEGORY = 5;

const MenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => {
  return (
    <Card className="flex overflow-hidden transition-shadow hover:shadow-md">
      {item.image_url && (
        <div className="w-24 h-24 flex-shrink-0">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <CardContent className="flex-1 p-3 flex flex-col justify-between">
        <div className="space-y-1">
          <h4 className="text-base font-semibold text-gray-800 line-clamp-2">{item.name}</h4>
          {item.description && (
            <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
          )}
        </div>
        <p className="text-sm font-bold text-green-600 mt-1">{formatPrice(item.price)}</p>
      </CardContent>
    </Card>
  );
};

const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ menuCategories, isFullMenuPage }) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  if (!menuCategories || menuCategories.length === 0) {
    return <p className="text-center text-gray-500 p-8">Nenhum item de menu disponível.</p>;
  }

  const activeCategories = menuCategories
    .filter(category => category.is_active)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  if (activeCategories.length === 0) {
    return <p className="text-center text-gray-500 p-8">Nenhuma categoria ativa disponível.</p>;
  }

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  return (
    <div className="space-y-8">
      {activeCategories.map((category) => {
        const activeItems = category.menu_items
          .filter(item => item.is_active)
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        if (activeItems.length === 0) return null;

        const isExpanded = expandedCategories[category.id] || isFullMenuPage;
        const displayItems = isExpanded || isFullMenuPage
          ? activeItems
          : activeItems.slice(0, MAX_ITEMS_PER_CATEGORY);

        const remainingItemsCount = activeItems.length - MAX_ITEMS_PER_CATEGORY;
        const showExpandButton = !isFullMenuPage && remainingItemsCount > 0;

        return (
          <div key={category.id} className="space-y-4">
            {/* Título da Categoria */}
            <h3 className="text-xl font-extrabold text-gray-800 border-b pb-2">{category.name}</h3>

            {/* Lista de Itens */}
            <div className="grid gap-4">
              {displayItems.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>

            {/* Botão de Expansão */}
            {showExpandButton && (
              <div className="text-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => toggleExpand(category.id)}
                  className="w-full sm:w-auto"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Ver menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Ver mais {remainingItemsCount} itens em {category.name}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RestaurantMenu;