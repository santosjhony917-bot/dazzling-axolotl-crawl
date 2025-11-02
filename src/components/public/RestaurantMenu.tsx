import React from 'react';
import { MenuCategory, MenuItem } from '@/types/restaurant'; // Importando MenuCategory e MenuItem do tipo estendido
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { formatCurrency } from '@/utils/formatters'; // Importar formatCurrency

interface RestaurantMenuProps {
  menuCategories: MenuCategory[] | null;
  isFullMenuPage: boolean;
}

const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ menuCategories, isFullMenuPage }) => {
  if (!menuCategories || menuCategories.length === 0) {
    return (
      <div className="text-center p-8 text-gray-600 bg-white rounded-xl shadow-soft-md">
        <p className="text-xl font-semibold">Nenhum item de menu disponível.</p>
        <p className="mt-2">O restaurante ainda não adicionou itens ao seu cardápio.</p>
      </div>
    );
  }

  const activeCategories = menuCategories
    .filter(category => category.is_active)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  if (activeCategories.length === 0) {
    return (
      <div className="text-center p-8 text-gray-600 bg-white rounded-xl shadow-soft-md">
        <p className="text-xl font-semibold">Nenhum item de menu ativo disponível.</p>
        <p className="mt-2">O restaurante ainda não ativou nenhum item no seu cardápio.</p>
      </div>
    );
  }

  const displayLimit = isFullMenuPage ? Infinity : 3; // Mostrar 3 itens por categoria na visualização resumida

  return (
    <div className="space-y-8">
      {activeCategories.map(category => {
        const activeItems = category.menu_items
          .filter(item => item.is_active)
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        const displayedItems = activeItems.slice(0, displayLimit);
        const remainingItemsCount = activeItems.length - displayedItems.length;

        if (displayedItems.length === 0 && !isFullMenuPage) {
          return null; // Não mostrar categorias vazias na visualização resumida
        }

        return (
          <div key={category.id} className="space-y-4">
            {/* Título da Categoria */}
            <h3 className="text-xl font-extrabold text-[#022D68] border-b pb-2">{category.name}</h3>

            {/* Itens do Menu */}
            <div className="grid gap-4">
              {displayedItems.map(item => (
                <Card key={item.id} className="flex items-center p-3 shadow-soft-sm rounded-xl">
                  {item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-24 h-24 object-cover rounded-lg mr-3 flex-shrink-0" 
                    />
                  )}
                  <div className="flex-grow">
                    <h4 className="font-semibold text-lg text-gray-800">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <p className="font-bold text-highlight mt-2">{formatCurrency(item.price)}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Botão "Ver mais" se houver itens restantes e não for a página completa */}
            {!isFullMenuPage && remainingItemsCount > 0 && (
              <div className="text-center mt-4">
                <Button asChild variant="outline" className="w-full max-w-xs mx-auto rounded-xl shadow-soft-md">
                  <Link to={createPageUrl('fullMenu', { restaurantId: category.restaurant_id })}>
                    Ver mais {remainingItemsCount} itens em {category.name}
                  </Link>
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