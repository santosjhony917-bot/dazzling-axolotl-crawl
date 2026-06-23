import { formatMenuPrice } from '@/utils/menuPricing';
import React, { useState } from 'react';
import { MenuCategory, MenuItem, MenuSection } from '@/types/supabase'; // Importando MenuCategory, MenuItem e MenuSection do tipo estendido
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/utils/formatters'; // Ajustado para o módulo correto
import { ChevronRight, Utensils, ChevronDown, ChevronUp } from 'lucide-react';
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
  menuSections?: MenuSection[]; // NOVO: Prop para as seções de menu
  isFullMenuPage?: boolean; // Nova prop para controlar a exibição completa
  restaurantId?: string; // Necessário para o link do cardápio completo
  forceShowFullMenuButton?: boolean; // NOVO: Prop para forçar a exibição do botão de menu completo
  isCompact?: boolean; // NOVO: Prop para indicar modo compacto
}


const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ menuCategories, menuSections = [], isFullMenuPage = false, restaurantId, forceShowFullMenuButton, isCompact }) => {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  
  if (menuCategories.length === 0) return null;

  const handleItemClick = (itemId: string) => {
    navigate(createPageUrl('menuItemDetails', { itemId }));
  };

  const toggleExpand = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };
  
  const handleViewFullMenu = () => {
    if (restaurantId) {
      navigate(createPageUrl('fullMenuPage', { restaurantId }));
    }
  };

  // Filtrar seções que possuem categorias ativas com itens ativos
  const activeSections = menuSections.filter(sec => 
    menuCategories.some(cat => 
      cat.section_id === sec.id && 
      cat.is_active && 
      cat.menu_items && 
      cat.menu_items.some(item => item.is_active)
    )
  );
  
  const hasSections = activeSections.length > 0;
  const activeSectionId = selectedSectionId || (hasSections ? activeSections[0].id : null);

  // 1. Filtrar categorias ativas que tenham pelo menos um item ativo
  let filteredCategories = menuCategories
    .filter(category => category.is_active && category.menu_items && category.menu_items.some(item => item.is_active));

  // Se o estabelecimento usa seções de menu, filtra as categorias pela seção ativa
  if (hasSections && activeSectionId) {
    filteredCategories = filteredCategories.filter(category => category.section_id === activeSectionId);
  }

  const activeCategories = filteredCategories.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    
  if (activeCategories.length === 0 && !hasSections) return null;

  interface DisplayCategory {
    id: string;
    name: string;
    items: MenuItem[];
  }

  const categoriesToDisplay: DisplayCategory[] = [];

  if (isFullMenuPage || hasSections) {
    // Se tem seções ou é página completa, mostra todos os itens da seção/página
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
    // Modo Preview (sem abas e página inicial): limite de 2 categorias e 5 itens
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
      {/* Horizontal Scrollable Tabs for Menu Sections */}
      {hasSections && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none border-b border-slate-100 -mx-4 px-4">
          {activeSections.map((sec) => {
            const isActive = sec.id === activeSectionId;
            return (
              <button
                key={sec.id}
                onClick={() => setSelectedSectionId(sec.id)}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-200",
                  isActive
                    ? "bg-[#EF2A39] text-white shadow-md shadow-red-500/20 scale-105"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                )}
              >
                {sec.name}
              </button>
            );
          })}
        </div>
      )}

      {categoriesToDisplay.length === 0 ? (
        <div className="text-center py-8">
          <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-medium">Nenhum item nesta seção.</p>
        </div>
      ) : (
        categoriesToDisplay.map((category, index) => {
          return (
            <div key={category.id} className="space-y-3">
              {/* Título da Categoria */}
              <div className="flex items-center gap-2">
                {index === 0 && (
                  <span className="text-lg leading-none">🔥</span>
                )}
                <h3 className="text-xl font-extrabold text-primary">{category.name}</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-y-3 w-full">
                {category.items.map((item) => {
                  let descText = item.description || '';
                  let options: any[] = [];
                  const itemDisplayName = item.display_name || item.name;
                  
                  try {
                    if (item.description && item.description.startsWith('{')) {
                      const parsed = JSON.parse(item.description);
                      descText = parsed.description || '';
                      options = parsed.options || [];
                    }
                  } catch (e) {
                    // ignore
                  }
                  
                  const isExpanded = !!expandedItems[item.id];
                  
                  return (
                    <div key={item.id} className="w-full flex flex-col">
                      <div
                        className="w-full min-w-0 p-3 flex items-start gap-3 hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)] transition-all duration-200 cursor-pointer border border-slate-100/60 rounded-[20px] shadow-[0_3px_12px_rgba(0,0,0,0.07)] bg-white active:scale-[0.98]"
                        onClick={() => handleItemClick(item.id)}
                      >
                        {item.image_url && (
                          <div className="relative w-[72px] h-[72px] flex-shrink-0 rounded-[16px] overflow-hidden border border-slate-100/60 bg-gray-50">
                            <img
                              src={item.image_url}
                              alt={itemDisplayName}
                              className="w-full h-full object-cover"
                            />
                            {item.is_illustrative && (
                              <div className="absolute top-1 right-1 text-white text-[7px] font-extrabold select-none tracking-wider uppercase drop-shadow-[0_1.2px_2px_rgba(0,0,0,0.85)]">
                                Ilustrativa
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-semibold text-[15px] text-[#3C2F2F] truncate flex-1 min-w-0 pr-1">{itemDisplayName}</h4>
                            <span className="shrink-0 text-[13px] font-bold text-[#EF2A39] bg-[#EF2A39]/8 px-2 py-0.5 rounded-lg">
                              {formatMenuPrice(item)}
                            </span>
                          </div>
                          {descText && (
                            <p className="text-[12px] text-[#9CA3AF] mt-1 line-clamp-2 leading-relaxed">{descText}</p>
                          )}
                        </div>
                        
                        {options.length > 0 ? (
                          <button
                            onClick={(e) => toggleExpand(item.id, e)}
                            className="p-1.5 rounded-full hover:bg-slate-100 flex-shrink-0 mt-0.5 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-500" />
                            )}
                          </button>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#D1D5DB] flex-shrink-0 mt-1" />
                        )}
                      </div>
                      
                      {/* Collapsible Accordion for options */}
                      {options.length > 0 && isExpanded && (
                        <div 
                          className="mt-2 ml-1 ml-[84px] mr-1 p-3.5 bg-slate-50/50 border border-slate-100 rounded-[20px] space-y-4 animate-in fade-in slide-in-from-top-1 duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {options.map((optGroup, gIdx) => (
                            <div key={gIdx} className="space-y-2">
                              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{optGroup.title}</p>
                              <div className="grid grid-cols-1 gap-1.5 text-xs">
                                {optGroup.itens.map((opt: any, oIdx: number) => (
                                  <div key={oIdx} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-100/60 shadow-sm">
                                    <span className="font-semibold text-slate-700">{opt.name}</span>
                                    {opt.price > 0 ? (
                                      <span className="text-[11px] font-bold text-[#EF2A39] bg-[#EF2A39]/8 px-1.5 py-0.5 rounded-md">
                                        +{formatPrice(opt.price)}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                        Incluso
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Separador entre categorias, exceto a última e apenas na prévia */}
              {!isFullMenuPage && index < categoriesToDisplay.length - 1 && (
                <Separator className="my-6 bg-gray-200" />
              )}
            </div>
          );
        })
      )}
      
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
