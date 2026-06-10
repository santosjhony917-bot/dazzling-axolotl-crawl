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
          <div key={category.id} className="space-y-3">
            {/* Título da Categoria */}
            <div className="flex items-center gap-2">
              {index === 0 && (
                <span className="text-lg leading-none">🔥</span>
              )}
              <h3 className="text-xl font-extrabold text-primary">{category.name}</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-y-3 w-full"> {/* Alterado de gap-4 para gap-y-3 para espaçamento vertical mais ajustado e adicionado grid-cols-1 w-full para evitar largura excedente */}
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="w-full min-w-0 p-3 flex items-start gap-3 hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)] transition-all duration-200 cursor-pointer border border-slate-100/60 rounded-[20px] shadow-[0_3px_12px_rgba(0,0,0,0.07)] bg-white active:scale-[0.98]"
                  onClick={() => handleItemClick(item.id)}
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-[72px] h-[72px] object-cover rounded-[16px] flex-shrink-0 border border-slate-100/60"
                    />
                  )}
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-[15px] text-[#3C2F2F] truncate flex-1 min-w-0 pr-1">{item.name}</h4>
                      <span className="shrink-0 text-[13px] font-bold text-[#EF2A39] bg-[#EF2A39]/8 px-2 py-0.5 rounded-lg">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-[12px] text-[#9CA3AF] mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#D1D5DB] flex-shrink-0 mt-1" />
                </div>
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
        <button
          onClick={handleViewFullMenu}
          className={cn(
            "w-full bg-[#EF2A39] text-white font-bold transition-all duration-200 mt-6",
            isCompact 
              ? "h-9 rounded-xl text-xs shadow-[0_4px_12px_rgba(239,42,57,0.25)]" 
              : "h-[52px] rounded-[20px] text-[16px] shadow-[0_8px_24px_rgba(239,42,57,0.35)] hover:shadow-[0_12px_32px_rgba(239,42,57,0.45)] active:scale-[0.98]"
          )}
        >
          Cardápio Completo
        </button>
      )}
    </div>
  );
};

export default RestaurantMenu;