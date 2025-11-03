"use client";

import React, { useState } from 'react';
import { MenuCategoryWithItems, MenuItem } from '@/types'; // Importando de '@/types'
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

interface RestaurantMenuProps {
  menuCategories: MenuCategoryWithItems[];
}

const RestaurantMenu = ({ menuCategories }: RestaurantMenuProps) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showAllItems, setShowAllItems] = useState<{ [key: string]: boolean }>({});

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleShowAllItems = (categoryId: string) => {
    setShowAllItems((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const activeCategories = menuCategories
    .filter(category => category.is_active)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  if (activeCategories.length === 0) {
    return <p className="text-center text-muted-foreground">Nenhum item de menu disponível.</p>;
  }

  return (
    <div className="space-y-6">
      {activeCategories.map((category) => {
        const isExpanded = expandedCategories.includes(category.id);
        const visibleItems = showAllItems[category.id]
          ? category.menu_items
          : category.menu_items.slice(0, 3);
        const remainingItemsCount = category.menu_items.length - visibleItems.length;

        return (
          <div key={category.id} className="space-y-4">
            {/* Título da Categoria */}
            <h3
              className="text-xl font-extrabold text-gray-800 border-b pb-2 cursor-pointer flex justify-between items-center"
              onClick={() => toggleCategoryExpansion(category.id)}
            >
              {category.name}
              <span className="text-sm text-muted-foreground">
                {isExpanded ? '▲' : '▼'}
              </span>
            </h3>

            {isExpanded && (
              <div className="grid gap-4">
                {visibleItems.map((item) => (
                  <Card key={item.id} className="flex overflow-hidden">
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <img
                        src={item.image_url || PLACEHOLDER_IMAGE_URL}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="flex-grow p-3 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-base">{item.name}</h4>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-bold text-primary mt-2">
                        R$ {item.price.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {remainingItemsCount > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => toggleShowAllItems(category.id)}
                    className="w-full mt-2"
                  >
                    Ver mais {remainingItemsCount} itens em {category.name}
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RestaurantMenu;