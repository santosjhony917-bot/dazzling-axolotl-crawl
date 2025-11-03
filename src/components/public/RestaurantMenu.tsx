"use client";

import React from 'react';
import { MenuCategoryWithItems, MenuItem } from '@/types/restaurant'; // Importando MenuCategoryWithItems e MenuItem
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';

interface RestaurantMenuProps {
  menuCategories: MenuCategoryWithItems[]; // Usando o novo tipo
  isFullMenuPage?: boolean;
  restaurantId: string;
}

const RestaurantMenu: React.FC<RestaurantMenuProps> = ({
  menuCategories,
  isFullMenuPage = false,
  restaurantId,
}) => {
  const navigate = useNavigate();
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([]);

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

  const activeCategories = menuCategories
    .filter(category => category.is_active)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  if (activeCategories.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">Nenhum item de cardápio disponível no momento.</p>
    );
  }

  return (
    <div className="space-y-8">
      {activeCategories.map(category => {
        const activeItems = category.menu_items
          .filter(item => item.is_active)
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        if (activeItems.length === 0) {
          return null;
        }

        const displayItems = isFullMenuPage ? activeItems : activeItems.slice(0, 3);
        const remainingItemsCount = activeItems.length - displayItems.length;
        const isExpanded = expandedCategories.includes(category.id);

        return (
          <div key={category.id} className="space-y-4">
            {/* Título da Categoria */}
            <h3 className="text-xl font-extrabold text-gray-800 pb-2">{category.name}</h3>

            {/* Itens do Cardápio */}
            <div className="grid gap-4">
              {(isExpanded ? activeItems : displayItems).map(item => (
                <Card key={item.id} className="flex items-center p-3 shadow-soft-md rounded-xl bg-white border border-gray-300">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg mr-4 flex-shrink-0"
                    />
                  )}
                  <CardContent className="flex-grow p-0">
                    <h4 className="font-semibold text-gray-800">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <p className="text-primary font-bold mt-2">{formatPrice(item.price)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Botão "Ver mais" para categorias não expandidas e não na página de menu completo */}
            {!isFullMenuPage && remainingItemsCount > 0 && (
              <Button
                variant="outline"
                className="w-full mt-4 text-primary border-primary hover:bg-primary hover:text-white"
                onClick={() => toggleCategoryExpansion(category.id)}
              >
                {isExpanded ? 'Ver menos' : `Ver mais ${remainingItemsCount} itens em ${category.name}`}
              </Button>
            )}
          </div>
        );
      })}

      {/* Botão "Ver Cardápio Completo" */}
      {!isFullMenuPage && (
        <div className="mt-8 text-center">
          <Button
            onClick={() => navigate(`/restaurant/${restaurantId}/menu`)}
            className={cn(
              "w-full font-bold transition-all duration-300 ease-in-out",
              {
                "h-12 text-lg rounded-xl": !isFullMenuPage, // Tamanho padrão
                "h-2 text-xs rounded-lg": isFullMenuPage // Altura ainda mais reduzida para modo compacto
              }
            )}
          >
            Ver Cardápio Completo
          </Button>
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;