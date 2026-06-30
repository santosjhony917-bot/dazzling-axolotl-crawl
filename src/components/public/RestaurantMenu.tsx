import { formatMenuPrice, getAdditiveOptionPrice, getMenuPriceSummary, getRequiredOptionRelativePricePreview } from '@/utils/menuPricing';
import React, { useState } from 'react';
import { MenuCategory, MenuItem, MenuSection } from '@/types/supabase'; // Importando MenuCategory, MenuItem e MenuSection do tipo estendido
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Check, ChevronRight, Utensils, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button'; // Importando Button
import { cn } from '@/lib/utils';
import { formatPrice } from '@/utils/formatters';
import { MenuComboBadge } from './MenuComboDetails';
import {
  getComboSimulationGroups,
  getComboComponents,
  getMenuOptionGroupInstruction,
  getMenuOptionGroups,
  getMenuOptionPriceLabel,
  getMenuOptionSelectionUnits,
  getOptionGroupPreviewLine,
  getPublicDescriptionText,
  isComboMenuItem,
  isConfigurableMenuItem,
} from '@/utils/menuCombos';

// Definindo o tipo de categoria esperado (com itens aninhados)
interface MenuCategoryWithItems extends MenuCategory {
  menu_items: MenuItem[];
}

type MenuSimulationSelections = Record<string, string[]>;
type MenuSimulationPriceGetter = (option: any, group: any) => number;

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const getGroupItems = (group: any): any[] => {
  if (Array.isArray(group?.items)) return group.items;
  if (Array.isArray(group?.itens)) return group.itens;
  if (Array.isArray(group?.menu_item_options)) return group.menu_item_options;
  return [];
};

const getGroupMinQuantity = (group: any): number => {
  const min = toNumberOrNull(group?.min_quantity ?? group?.min) || 0;
  if (min > 0) return min;
  return group?.is_required ? 1 : 0;
};

const getGroupMaxQuantity = (group: any): number => toNumberOrNull(group?.max_quantity ?? group?.max) || 0;

const getSimulationGroupKey = (group: any, groupIndex: number): string => (
  `${groupIndex}:${group?.id || group?.name || group?.title || 'grupo'}`
);

const getSimulationOptionKey = (option: any, optionIndex: number): string => (
  `${optionIndex}:${option?.id || option?.name || option?.title || 'opcao'}`
);

const usesSelectionUnits = (group: any): boolean => (
  getGroupItems(group).some((option: any) => getMenuOptionSelectionUnits(option, group) > 1)
);

const getSelectedSelectionUnits = (group: any, selectedKeys: string[]): number => (
  getGroupItems(group).reduce((sum, option, optionIndex) => {
    const optionKey = getSimulationOptionKey(option, optionIndex);
    if (!selectedKeys.includes(optionKey)) return sum;
    return sum + getMenuOptionSelectionUnits(option, group);
  }, 0)
);

const getSimulationOptionPriceLabel = (
  group: any,
  option: any,
  priceGetter: MenuSimulationPriceGetter,
): { label: string; tone: 'included' | 'delta' } => {
  const items = getGroupItems(group);
  const min = getGroupMinQuantity(group);
  const prices = items.map((itemOption: any) => priceGetter(itemOption, group));
  const hasPriceImpact = prices.some((value: number) => value > 0);
  const hasPriceRange = new Set(prices.map((value: number) => value.toFixed(2))).size > 1;
  const optionPrice = priceGetter(option, group);

  if (min === 1 && hasPriceImpact && hasPriceRange) {
    const minimum = Math.min(...prices);
    const diff = Number((optionPrice - minimum).toFixed(2));
    if (!Number.isFinite(diff) || diff <= 0) return { label: 'Sem acréscimo', tone: 'included' };
    return { label: `+${formatPrice(diff)}`, tone: 'delta' };
  }

  if (optionPrice > 0) return { label: `+${formatPrice(optionPrice)}`, tone: 'delta' };
  return { label: 'Sem acréscimo', tone: 'included' };
};

const buildInitialSimulationSelections = (
  groups: any[],
  priceGetter: MenuSimulationPriceGetter = getAdditiveOptionPrice,
): MenuSimulationSelections => {
  return groups.reduce<MenuSimulationSelections>((acc, group, groupIndex) => {
    const groupKey = getSimulationGroupKey(group, groupIndex);
    const min = getGroupMinQuantity(group);
    const max = getGroupMaxQuantity(group);
    const items = getGroupItems(group);
    if (min <= 0 || items.length === 0) {
      acc[groupKey] = [];
      return acc;
    }

    const candidates = items
      .map((option, optionIndex) => ({
        key: getSimulationOptionKey(option, optionIndex),
        option,
        optionIndex,
        price: priceGetter(option, group),
        units: getMenuOptionSelectionUnits(option, group),
      }))
      .sort((a, b) => a.price - b.price || a.optionIndex - b.optionIndex);

    if (usesSelectionUnits(group)) {
      const selected: string[] = [];
      let selectedUnits = 0;
      const targetUnits = max > 0 ? max : min;
      for (const candidate of candidates) {
        const wouldExceed = max > 0 && selectedUnits + candidate.units > max;
        if (wouldExceed) continue;
        selected.push(candidate.key);
        selectedUnits += candidate.units;
        if (selectedUnits >= targetUnits) break;
      }
      acc[groupKey] = selected;
      return acc;
    }

    const desiredCount = Math.min(min, max > 0 ? max : min, items.length);
    acc[groupKey] = candidates
      .slice(0, desiredCount)
      .map((option) => option.key);

    return acc;
  }, {});
};

const calculateSimulatedTotal = (
  item: MenuItem,
  groups: any[],
  selections: MenuSimulationSelections,
  priceGetter: MenuSimulationPriceGetter = getAdditiveOptionPrice,
): number | null => {
  const summary = getMenuPriceSummary(item);
  const hasAnySelection = groups.some((group, groupIndex) => {
    const groupKey = getSimulationGroupKey(group, groupIndex);
    return (selections[groupKey] || []).length > 0;
  });
  if (summary.basePrice === null && !hasAnySelection) return summary.minimumPrice;

  const total = groups.reduce((sum, group, groupIndex) => {
    const groupKey = getSimulationGroupKey(group, groupIndex);
    const selectedKeys = selections[groupKey] || [];
    if (selectedKeys.length === 0) return sum;

    return getGroupItems(group).reduce((groupSum, option, optionIndex) => {
      const optionKey = getSimulationOptionKey(option, optionIndex);
      if (!selectedKeys.includes(optionKey)) return groupSum;
      return groupSum + priceGetter(option, group);
    }, sum);
  }, summary.basePrice ?? 0);

  return Number(total.toFixed(2));
};

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
  const [itemSelections, setItemSelections] = useState<Record<string, MenuSimulationSelections>>({});
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  
  if (menuCategories.length === 0) return null;

  const handleItemClick = (itemId: string) => {
    navigate(createPageUrl('menuItemDetails', { itemId }));
  };

  const toggleExpand = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const getActiveSelections = (
    item: MenuItem,
    groups: any[],
    priceGetter: MenuSimulationPriceGetter = getAdditiveOptionPrice,
  ): MenuSimulationSelections => (
    itemSelections[item.id] || buildInitialSimulationSelections(groups, priceGetter)
  );

  const handleSimulatorOptionToggle = (
    item: MenuItem,
    groups: any[],
    group: any,
    groupIndex: number,
    option: any,
    optionIndex: number,
    priceGetter: MenuSimulationPriceGetter = getAdditiveOptionPrice,
  ) => {
    const groupKey = getSimulationGroupKey(group, groupIndex);
    const optionKey = getSimulationOptionKey(option, optionIndex);
    const min = getGroupMinQuantity(group);
    const max = getGroupMaxQuantity(group);

    setItemSelections((prev) => {
      const itemSelection = prev[item.id] || buildInitialSimulationSelections(groups, priceGetter);
      const current = itemSelection[groupKey] || [];
      const isSelected = current.includes(optionKey);

      if (usesSelectionUnits(group) && max > 1) {
        const optionUnits = getMenuOptionSelectionUnits(option, group);
        const currentUnits = getSelectedSelectionUnits(group, current);

        if (isSelected) {
          if (currentUnits - optionUnits < min) return prev;
          return { ...prev, [item.id]: { ...itemSelection, [groupKey]: current.filter((key) => key !== optionKey) } };
        }

        if (optionUnits >= max || currentUnits >= max || currentUnits + optionUnits > max) {
          const next = current.slice();
          while (next.length > 0 && getSelectedSelectionUnits(group, next) + optionUnits > max) {
            next.shift();
          }
          return { ...prev, [item.id]: { ...itemSelection, [groupKey]: [...next, optionKey] } };
        }

        return { ...prev, [item.id]: { ...itemSelection, [groupKey]: [...current, optionKey] } };
      }

      if (max === 1) {
        if (isSelected) {
          return min > 0 ? prev : { ...prev, [item.id]: { ...itemSelection, [groupKey]: [] } };
        }
        return { ...prev, [item.id]: { ...itemSelection, [groupKey]: [optionKey] } };
      }

      if (isSelected) {
        if (current.length <= min) return prev;
        return { ...prev, [item.id]: { ...itemSelection, [groupKey]: current.filter((key) => key !== optionKey) } };
      }

      if (max > 0 && current.length >= max) return prev;
      return { ...prev, [item.id]: { ...itemSelection, [groupKey]: [...current, optionKey] } };
    });
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
        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto border-b border-slate-100 px-4 pb-3 scrollbar-none">
          {activeSections.map((sec) => {
            const isActive = sec.id === activeSectionId;
            return (
              <button
                key={sec.id}
                onClick={() => setSelectedSectionId(sec.id)}
                className={cn(
                  "flex h-9 shrink-0 items-center rounded-full px-3.5 text-xs font-semibold whitespace-nowrap transition-all duration-200",
                  isActive
                    ? "bg-highlight text-white shadow-[0_4px_12px_rgba(223,75,28,0.14)]"
                    : "border border-slate-100 bg-white text-text-secondary shadow-sm hover:bg-slate-50 hover:text-[#3C2F2F]"
                )}
              >
                {sec.name}
              </button>
            );
          })}
        </div>
      )}

      {categoriesToDisplay.length === 0 ? (
        <div className="rounded-[24px] border border-slate-100 bg-white px-6 py-10 text-center shadow-soft">
          <Utensils className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-text-secondary">Nenhum item nesta seção.</p>
        </div>
      ) : (
        categoriesToDisplay.map((category, index) => {
          return (
            <div key={category.id} className="space-y-3">
              {/* Título da Categoria */}
              <div className="flex items-center justify-between gap-3">
                <h3 className="min-w-0 truncate text-[18px] font-semibold tracking-tight text-[#3C2F2F]">{category.name}</h3>
                <span className="shrink-0 rounded-full bg-highlight/10 px-2 py-0.5 text-[11px] font-semibold text-highlight">
                  {category.items.length} itens
                </span>
              </div>
              
              <div className="grid w-full grid-cols-1 gap-3">
                {category.items.map((item) => {
                  const descText = getPublicDescriptionText(item);
                  const itemDisplayName = item.display_name || item.name;
                  const comboComponents = getComboComponents(item);
                  const isCombo = isComboMenuItem(item);
                  const nativeOptions: any[] = getMenuOptionGroups(item);
                  const comboOptions: any[] = getComboSimulationGroups(comboComponents);
                  const options: any[] = nativeOptions.length > 0 ? nativeOptions : comboOptions;
                  const simulationPriceGetter = getAdditiveOptionPrice;
                  const isConfigurable = isConfigurableMenuItem(item);
                  const hasExpandableDetails = options.length > 0;
                  const isExpanded = !!expandedItems[item.id];
                  const activeSelections = getActiveSelections(item, options, simulationPriceGetter);
                  const simulatedTotal = calculateSimulatedTotal(item, options, activeSelections, simulationPriceGetter);
                  const displayPriceLabel = simulatedTotal !== null ? formatPrice(simulatedTotal) : formatMenuPrice(item);
                  const optionPreviewLines = (isConfigurable || isCombo)
                    ? options.map((group) => getOptionGroupPreviewLine(group)).filter(Boolean).slice(0, 3)
                    : [];
                  
                  return (
                    <div key={item.id} className="w-full flex flex-col">
                      <div
                        className={cn(
                          "flex w-full min-w-0 cursor-pointer items-start gap-3 rounded-[22px] border border-slate-100 bg-white p-3 shadow-soft transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
                        )}
                        onClick={() => handleItemClick(item.id)}
                      >
                        {item.image_url && (
                          <div className="relative h-[74px] w-[74px] flex-shrink-0 overflow-hidden rounded-[16px] border border-slate-100 bg-slate-50">
                            <img
                              src={item.image_url}
                              alt={itemDisplayName}
                              className="h-full w-full object-contain"
                            />
                            {item.is_illustrative && (
                              <div className="absolute right-1 top-1 select-none rounded-full bg-black/35 px-1.5 py-0.5 text-[7px] font-medium uppercase tracking-wide text-white">
                                Ilustrativa
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 pr-1">
                              <h4 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#3C2F2F]">{itemDisplayName}</h4>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {isCombo && <MenuComboBadge item={item} components={comboComponents} />}
                                {isConfigurable && hasExpandableDetails && (
                                  <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600">
                                    Opções
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="shrink-0 whitespace-nowrap rounded-lg bg-highlight/10 px-2 py-0.5 text-[13px] font-semibold text-highlight">
                              {displayPriceLabel}
                            </span>
                          </div>
                          {descText && (
                            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-text-secondary">{descText}</p>
                          )}
                          {optionPreviewLines.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {optionPreviewLines.map((line, lineIndex) => (
                                <div key={`${item.id}-option-preview-${lineIndex}`} className="flex items-center gap-2 text-[11px] font-semibold text-text-secondary">
                                  <span className="h-1.5 w-1.5 rounded-full bg-highlight/70" />
                                  <span className="line-clamp-1">{line}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {hasExpandableDetails ? (
                          <button
                            onClick={(e) => toggleExpand(item.id, e)}
                            className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-50"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-slate-300" />
                        )}
                      </div>
                      
                      {/* Collapsible Accordion for options */}
                      {hasExpandableDetails && isExpanded && (
                        <div 
                          className="mt-2 space-y-4 rounded-[22px] border border-slate-100 bg-white p-3.5 shadow-soft animate-in fade-in slide-in-from-top-1 duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {options.map((optGroup, gIdx) => (
                            <div key={gIdx} className="space-y-2">
                              <div className="flex flex-wrap items-start justify-between gap-1.5">
                                <p className="min-w-0 text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-500">{optGroup.title || optGroup.name}</p>
                                <span className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[9px] font-semibold uppercase text-text-secondary">
                                  {getMenuOptionGroupInstruction(optGroup)}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-1.5 text-xs">
                                {(optGroup.items || optGroup.itens || []).map((opt: any, oIdx: number) => {
                                  const groupKey = getSimulationGroupKey(optGroup, gIdx);
                                  const optionKey = getSimulationOptionKey(opt, oIdx);
                                  const isSelected = (activeSelections[groupKey] || []).includes(optionKey);
                                  const priceLabel = getRequiredOptionRelativePricePreview(item, optGroup, opt) || getMenuOptionPriceLabel(opt, optGroup);
                                  return (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      onClick={() => handleSimulatorOptionToggle(item, options, optGroup, gIdx, opt, oIdx, simulationPriceGetter)}
                                      className={cn(
                                        "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left shadow-sm transition-colors",
                                        isSelected
                                          ? "border-highlight/35 bg-highlight/10"
                                          : "border-slate-100/60 bg-white hover:bg-slate-50"
                                      )}
                                    >
                                      <div className="flex min-w-0 items-center gap-2">
                                        <span className={cn(
                                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-white",
                                          isSelected ? "border-highlight bg-highlight" : "border-slate-200 bg-white"
                                        )}>
                                          {isSelected && <Check className="h-3 w-3" />}
                                        </span>
                                        <span className="font-semibold text-slate-700">{opt.name}</span>
                                      </div>
                                      <span className={cn(
                                        "shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-md",
                                        priceLabel.tone === 'included'
                                          ? "text-emerald-600 bg-emerald-50"
                                          : priceLabel.tone === 'absolute'
                                            ? "text-slate-700 bg-slate-100"
                                            : "bg-highlight/10 text-highlight"
                                      )}>
                                        {priceLabel.label}
                                      </span>
                                    </button>
                                  );
                                })}
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
            "mt-6 w-full bg-highlight text-white font-semibold transition-all duration-200",
            isCompact 
              ? "h-9 rounded-xl text-xs shadow-[0_4px_12px_rgba(223,75,28,0.14)]" 
              : "h-[52px] rounded-[20px] text-[16px] shadow-[0_8px_20px_rgba(223,75,28,0.18)] active:scale-[0.99]"
          )}
        >
          Cardápio Completo
        </button>
      )}
    </div>
  );
};

export default RestaurantMenu;
