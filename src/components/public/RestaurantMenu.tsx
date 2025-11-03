import React from 'react';
import { MenuCategory, MenuItem } from '@/types/restaurant'; // Importando MenuCategory e MenuItem do tipo estendido
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/lib/utils'; // Adicionando formatPrice
import { ChevronRight, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button'; // Importando Button
import { cn } from '@/lib/utils';

// Definindo o tipo de categoria esperado (com itens aninhados)
interface MenuCategoryWithItems extends MenuCategory {
  menu_items: MenuItem[];
}

interface RestaurantMenuProps {
  menuCategories: MenuCategoryWithItems[];
  isFullMenuPage?: boolean; // Nova prop para controlar a exibição completa
  restaurantId?: string; // Necessário para o link do cardápio completo
}

// NOVOS LIMITES
const MAX_CATEGORIES_PREVIEW = 2;
const MAX_ITEMS_PER_CATEGORY_PREVIEW = 5;

const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ menuCategories, isFullMenuPage = false, restaurantId }) => {
  const navigate = useNavigate();
  
  if (menuCategories.length === 0) return null;

  const handleItemClick = (itemId: string) => {
    navigate(createPageUrl('menuItemDetails', { itemId }));
  };
  
  const handleViewFullMenu = () => {
    if (restaurantId) {
      navigate(createPageUrl('fullMenuPage', { restaurantId }));
    }
  };

  // Lógica de filtragem e limitação
  const activeCategories = menuCategories
    .filter(category => category.is_active)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    
  const categoriesToDisplay = isFullMenuPage 
    ? activeCategories 
    : activeCategories.slice(0, MAX_CATEGORIES_PREVIEW);
    
  const shouldShowFullMenuButton = !isFullMenuPage && (
    activeCategories.length > MAX_CATEGORIES_PREVIEW || 
    activeCategories.some(cat => cat.menu_items.filter(item => item.is_active).length > MAX_ITEMS_PER_CATEGORY_PREVIEW)
  );

  return (
    <div 
      id="menu" 
      className={cn(
        "space-y-6",
        shouldShowFullMenuButton && "mb-8" // Adiciona margem inferior extra se o botão de menu completo estiver visível
      )}
    >
      {/* Título da seção: Removido para evitar redundância com a aba ativa */}

      {categoriesToDisplay.map((category, index) => {
        const activeItems = category.menu_items
          .filter(item => item.is_active)
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
          
        const itemsToDisplay = isFullMenuPage 
          ? activeItems 
          : activeItems.slice(0, MAX_ITEMS_PER_CATEGORY_PREVIEW);
          
        const remainingItemsCount = activeItems.length - itemsToDisplay.length;

        return (
          <div key={category.id} className="space-y-4">
            {/* Título da Categoria */}
            <h3 className="text-xl font-extrabold text-gray-800 border-b pb-2">{category.name}</h3>
            
            <div className="grid gap-y-3"> {/* Alterado de gap-4 para gap-y-3 para espaçamento vertical mais ajustado */}
              {itemsToDisplay.map((item) => (
                <Card 
                  key={item.id} 
                  className="p-4 flex items-start space-x-4 border border-gray-200"
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
                      <h4 className="font-semibold text-lg text-primary">{item.name}</h4>
                      <p className="font-bold text-lg text-primary ml-4">
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
              
              {/* Botão para ver mais itens na categoria (apenas na prévia) */}
              {!isFullMenuPage && remainingItemsCount > 0 && (
                <Button 
                  variant="link" 
                  onClick={handleViewFullMenu}
                  className="text-primary p-0 h-auto text-sm font-semibold justify-start"
                >
                  Ver mais {remainingItemsCount} itens em {category.name}
                </Button>
              )}
            </div>
            {/* Separador entre categorias, exceto a última e apenas na prévia */}
            {!isFullMenuPage && index < categoriesToDisplay.length - 1 && (
              <Separator className="my-6 bg-gray-200" />
            )}
          </div>
        );
      })}
      
      {/* Botão Ver Cardápio Completo (apenas na prévia) */}
      {shouldShowFullMenuButton && restaurantId && (
        <Button 
          onClick={handleViewFullMenu}
          variant="default"
          className="w-full h-12 rounded-xl text-lg font-bold mt-6"
        >
          Ver Cardápio Completo
        </Button>
      )}
    </div>
  );
};

export default RestaurantMenu;