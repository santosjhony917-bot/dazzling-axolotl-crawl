import React from 'react';
import { MenuCategory, MenuItem } from '@/types/supabase'; // Importando MenuCategory e MenuItem do tipo estendido
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/utils/formatters'; // Ajustado para o módulo correto
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
  forceShowFullMenuButton?: boolean; // NOVO: Prop para forçar a exibição do botão de menu completo
  isCompact?: boolean; // NOVO: Prop para indicar modo compacto
}


const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ menuCategories, isFullMenuPage = false, restaurantId, forceShowFullMenuButton, isCompact }) => {
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

  // 1. Filtrar categorias ativas que tenham pelo menos um item ativo
  const activeCategories = menuCategories
    .filter(category => category.is_active && category.menu_items && category.menu_items.some(item => item.is_active))
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    
  if (activeCategories.length === 0) return null;

  interface DisplayCategory {
    id: string;
    name: string;
    items: MenuItem[];
  }

  const categoriesToDisplay: DisplayCategory[] = [];

  if (isFullMenuPage) {
    activeCategories.forEach(category => {
      const activeItems = category.menu_items
        .filter(item => item.is_active)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      
      categoriesToDisplay.push({
        id: category.id,
        name: category.name,
        items: activeItems
      });
    });
  } else {
    // Modo Preview (página inicial do perfil público):
    // Limite de no máximo 2 categorias e soma de no máximo 5 itens expostos
    let totalItemsDisplayed = 0;
    
    for (const category of activeCategories) {
      if (categoriesToDisplay.length >= 2 || totalItemsDisplayed >= 5) {
        break;
      }
      
      const activeItems = category.menu_items
        .filter(item => item.is_active)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        
      const remainingSlots = 5 - totalItemsDisplayed;
      const itemsToTake = activeItems.slice(0, remainingSlots);
      
      if (itemsToTake.length > 0) {
        categoriesToDisplay.push({
          id: category.id,
          name: category.name,
          items: itemsToTake
        });
        totalItemsDisplayed += itemsToTake.length;
      }
    }
  }
    
  const shouldShowFullMenuButton = !isFullMenuPage && restaurantId !== undefined;

  return (
    <div 
      id="menu" 
      className={cn(
        "space-y-6",
        shouldShowFullMenuButton && "mb-8"
      )}
    >
      {/* Título da seção: Removido para evitar redundância com a aba ativa */}

      {categoriesToDisplay.map((category, index) => {
        return (
          <div key={category.id} className="space-y-4">
            {/* Título da Categoria */}
            <h3 className="text-xl font-extrabold text-primary pb-2">{category.name}</h3>
            
            <div className="grid grid-cols-1 gap-y-3 w-full"> {/* Alterado de gap-4 para gap-y-3 para espaçamento vertical mais ajustado e adicionado grid-cols-1 w-full para evitar largura excedente */}
              {category.items.map((item) => (
                <Card 
                  key={item.id} 
                  className="w-full min-w-0 p-3 flex items-start gap-4 hover:shadow-soft-lg transition-all duration-200 cursor-pointer border border-gray-100 rounded-2xl shadow-soft-md bg-white"
                  onClick={() => handleItemClick(item.id)}
                >
                  {item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-20 h-20 object-cover rounded-xl flex-shrink-0 shadow-sm border border-gray-100"
                    />
                  )}
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-lg text-primary truncate pr-2">{item.name}</h4>
                      <p className="font-bold text-lg text-highlight shrink-0">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-2" />
                </Card>
              ))}
            </div>
            {/* Separador entre categorias, exceto a última e apenas na prévia */}
            {!isFullMenuPage && index < categoriesToDisplay.length - 1 && (
              <Separator className="my-6 bg-gray-200" />
            )}
          </div>
        );
      })}
      
      {/* Botão Ver Cardápio Completo (apenas na prévia) */}
      {shouldShowFullMenuButton && (
        <Button 
          onClick={handleViewFullMenu}
          variant="default"
          className={cn("w-full font-bold mt-6", {
            "h-12 text-lg rounded-xl": !isCompact, // Tamanho padrão
            "h-10 text-sm rounded-lg": isCompact // Altura ajustada para ser legível no modo compacto
          })}
        >
          Cardápio Completo
        </Button>
      )}
    </div>
  );
};

export default RestaurantMenu;