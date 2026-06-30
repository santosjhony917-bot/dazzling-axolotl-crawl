import { getAdditiveOptionPrice, getMenuPriceSummary, getRequiredOptionRelativePricePreview } from '@/utils/menuPricing';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, Loader2, ArrowLeft, Utensils, AlertTriangle, Check, Maximize2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useMenuItemFavorites } from '@/hooks/useMenuItemFavorites';
import { useAuthData } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';
import { createPageUrl } from '@/utils/url';
import { useQuery } from '@tanstack/react-query';
import { fetchMenuItemById } from '@/integrations/supabase/restaurant';
import { MenuItem, Restaurant } from '@/types/supabase';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import Header from '@/components/Header';
import PhoneShell from '@/components/layout/PhoneShell';
import { MenuComboBadge } from '@/components/public/MenuComboDetails';
import { formatPrice } from '@/utils/formatters';
import {
  getComboSimulationGroups,
  getComboComponents,
  getMenuOptionGroupInstruction,
  getMenuOptionGroups,
  getMenuOptionPriceLabel,
  getMenuOptionSelectionUnits,
  getPublicDescriptionText,
  isComboMenuItem,
  isConfigurableMenuItem,
} from '@/utils/menuCombos';

// Tipo de dado esperado após o fetch
type DetailedMenuItem = (MenuItem & { restaurant: Restaurant | null });

type SimulationSelections = Record<string, string[]>;
type SimulationPriceGetter = (option: any, group: any) => number;

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
  priceGetter: SimulationPriceGetter,
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
  priceGetter: SimulationPriceGetter = getAdditiveOptionPrice,
): SimulationSelections => {
  return groups.reduce<SimulationSelections>((acc, group, groupIndex) => {
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
  item: DetailedMenuItem,
  groups: any[],
  selections: SimulationSelections,
  priceGetter: SimulationPriceGetter = getAdditiveOptionPrice,
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

const MenuItemDetails: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthData();
  
  useEffect(() => {
    if (!itemId) {
      showError("ID do item não encontrado.");
      navigate(-1);
    }
  }, [itemId, navigate]);
  
  // Query para buscar os detalhes do item
  const { data: itemData, isLoading, error } = useQuery<DetailedMenuItem | null, Error>({
    queryKey: ['menuItemDetails', itemId],
    queryFn: () => fetchMenuItemById(itemId || ''),
    enabled: !!itemId,
    staleTime: 1000 * 60 * 5,
  });
  
  // Usando o hook de favoritos
  const { isFavorite, toggleFavorite, isLoading: isFavoriteMutating } = useMenuItemFavorites(itemId || '');
  
  const handleBack = () => navigate(-1);

  const normalizedOptions = useMemo(() => (
    itemData ? getMenuOptionGroups(itemData) : []
  ), [itemData]);

  const comboComponents = useMemo(() => (
    itemData ? getComboComponents(itemData) : []
  ), [itemData]);

  const comboOptionGroups = useMemo(() => (
    getComboSimulationGroups(comboComponents)
  ), [comboComponents]);

  const isComboForDisplay = itemData ? isComboMenuItem(itemData) : false;
  const simulationGroups = useMemo(() => (
    normalizedOptions.length > 0 ? normalizedOptions : comboOptionGroups
  ), [normalizedOptions, comboOptionGroups]);
  const simulationPriceGetter = getAdditiveOptionPrice;

  const priceSummaryData = useMemo(() => (
    itemData ? getMenuPriceSummary(itemData) : null
  ), [itemData]);

  const initialSimulationSelections = useMemo(() => (
    buildInitialSimulationSelections(simulationGroups, simulationPriceGetter)
  ), [simulationGroups]);

  const [simulatedSelections, setSimulatedSelections] = useState<SimulationSelections>({});
  const [isImageOpen, setIsImageOpen] = useState(false);

  useEffect(() => {
    setSimulatedSelections(initialSimulationSelections);
  }, [itemData?.id, initialSimulationSelections]);

  const activeSimulationSelections = Object.keys(simulatedSelections).length > 0
    ? simulatedSelections
    : initialSimulationSelections;

  const simulatedTotal = useMemo(() => (
    itemData ? calculateSimulatedTotal(itemData, simulationGroups, activeSimulationSelections, simulationPriceGetter) : null
  ), [itemData, simulationGroups, activeSimulationSelections]);

  const handleSimulatorOptionToggle = (group: any, groupIndex: number, option: any, optionIndex: number) => {
    const groupKey = getSimulationGroupKey(group, groupIndex);
    const optionKey = getSimulationOptionKey(option, optionIndex);
    const min = getGroupMinQuantity(group);
    const max = getGroupMaxQuantity(group);

    setSimulatedSelections((prev) => {
      const current = prev[groupKey] || [];
      const isSelected = current.includes(optionKey);

      if (usesSelectionUnits(group) && max > 1) {
        const optionUnits = getMenuOptionSelectionUnits(option, group);
        const currentUnits = getSelectedSelectionUnits(group, current);

        if (isSelected) {
          if (currentUnits - optionUnits < min) return prev;
          return { ...prev, [groupKey]: current.filter((key) => key !== optionKey) };
        }

        if (optionUnits >= max || currentUnits >= max || currentUnits + optionUnits > max) {
          const next = current.slice();
          while (next.length > 0 && getSelectedSelectionUnits(group, next) + optionUnits > max) {
            next.shift();
          }
          return { ...prev, [groupKey]: [...next, optionKey] };
        }

        return { ...prev, [groupKey]: [...current, optionKey] };
      }

      if (max === 1) {
        if (isSelected) {
          return min > 0 ? prev : { ...prev, [groupKey]: [] };
        }
        return { ...prev, [groupKey]: [optionKey] };
      }

      if (isSelected) {
        if (current.length <= min) return prev;
        return { ...prev, [groupKey]: current.filter((key) => key !== optionKey) };
      }

      if (max > 0 && current.length >= max) return prev;
      return { ...prev, [groupKey]: [...current, optionKey] };
    });
  };

  if (!itemId) {
    return null;
  }

  if (isLoading) {
    return (
      <PhoneShell>
        <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
          <Loader2 className="h-7 w-7 animate-spin text-highlight" />
        </div>
      </PhoneShell>
    );
  }
  
  if (error || !itemData) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Prato Não Encontrado</h2>
        <p className="text-gray-600 mb-6">O item de menu solicitado não existe ou foi removido.</p>
        <Button onClick={handleBack}>
          Voltar
        </Button>
      </div>
    );
  }
  
  const restaurantName = itemData.restaurant?.name || 'Restaurante Desconhecido';
  const restaurantId = itemData.restaurant?.id;

  const descText = getPublicDescriptionText(itemData);
  const options: any[] = simulationGroups;
  const isCombo = isComboForDisplay;
  const isConfigurable = isConfigurableMenuItem(itemData);
  const priceSummary = priceSummaryData || getMenuPriceSummary(itemData);
  const primaryPriceLabel = simulatedTotal !== null ? formatPrice(simulatedTotal) : priceSummary.label;

  return (
    <PhoneShell>
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <Header 
        title="Detalhes do Prato"
        leftAction={{ icon: ArrowLeft, onClick: handleBack }}
      />
 
      <main className="flex-grow space-y-6 p-4 pb-8">
        <Card className="overflow-hidden rounded-[24px] border border-slate-100 bg-white p-0 shadow-soft">
          
          {/* Imagem do Prato */}
          <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-[#F8FAFC]">
            <img 
              src={itemData.image_url || PLACEHOLDER_IMAGE_URL} 
              alt={itemData.name} 
              className="h-full w-full object-contain"
              loading="eager"
              decoding="async"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/10 to-transparent" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsImageOpen(true)}
              className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white/95 shadow-none backdrop-blur-sm hover:bg-white"
              aria-label="Ampliar foto do prato"
            >
              <Maximize2 className="h-4 w-4 text-slate-600" />
            </Button>
            
            {/* Botão de Favoritar */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFavorite}
              disabled={!isAuthenticated || isFavoriteMutating}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white/95 shadow-none backdrop-blur-sm hover:bg-white"
            >
              {isFavoriteMutating ? (
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              ) : (
                <Heart 
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isFavorite ? "text-red-500 fill-red-500" : "text-slate-400 hover:text-red-500"
                  )}
                />
              )}
            </Button>
          </div>
 
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-2">
              <h1 className="flex-1 text-[22px] font-semibold leading-tight tracking-tight text-[#3C2F2F]">{itemData.name}</h1>
              {isCombo && <MenuComboBadge item={itemData} components={comboComponents} />}
              {isConfigurable && (
                <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Montável
                </span>
              )}
            </div>
            
            <div className="rounded-[22px] border border-orange-100 bg-orange-50/50 p-3.5">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-orange-500">
                Total simulado
              </span>
              <p className="mt-0.5 text-[26px] font-semibold tracking-tight text-highlight">
                {primaryPriceLabel}
              </p>
            </div>
            
            {descText && (
              <p className="text-[15px] leading-relaxed text-text-secondary">
                {descText}
              </p>
            )}

            {options.length > 0 && (
              <div className="space-y-4 pt-2">
                <Separator className="bg-slate-100" />
                {options.map((optGroup, gIdx) => (
                  <div key={gIdx} className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                        {optGroup.title || optGroup.name}
                      </h3>
                      <span className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase text-slate-400">
                        {getMenuOptionGroupInstruction(optGroup)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {(optGroup.items || optGroup.itens || []).map((opt: any, oIdx: number) => {
                        const groupKey = getSimulationGroupKey(optGroup, gIdx);
                        const optionKey = getSimulationOptionKey(opt, oIdx);
                        const isSelected = (activeSimulationSelections[groupKey] || []).includes(optionKey);
                        const priceLabel = getRequiredOptionRelativePricePreview(itemData, optGroup, opt) || getMenuOptionPriceLabel(opt, optGroup);
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleSimulatorOptionToggle(optGroup, gIdx, opt, oIdx)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                              isSelected
                                ? "border-highlight/35 bg-highlight/10"
                                : "border-slate-100/60 bg-slate-50/50 hover:bg-slate-50"
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-white",
                                isSelected ? "border-highlight bg-highlight" : "border-slate-200 bg-white"
                              )}>
                                {isSelected && <Check className="h-3.5 w-3.5" />}
                              </span>
                              <span className="text-sm font-semibold text-slate-700">{opt.name}</span>
                            </div>
                            <span className={cn(
                              "shrink-0 text-xs font-bold px-2 py-0.5 rounded-md",
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
            
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold pt-2">
              <Utensils className="w-4 h-4 text-highlight/70" />
              <p>Servido por: <span className="text-slate-700">{restaurantName}</span></p>
            </div>
            
            {restaurantId && (
              <Button 
                onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurantId }))}
                variant="outline"
                className="h-11 w-full rounded-2xl border border-slate-200 font-semibold text-slate-700 shadow-none transition-colors hover:bg-slate-50"
              >
                Ver Restaurante
              </Button>
            )}
          </CardContent>
        </Card>
      </main>

      {isImageOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setIsImageOpen(false)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md"
            aria-label="Fechar foto ampliada"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={itemData.image_url || PLACEHOLDER_IMAGE_URL}
            alt={itemData.name}
            className="max-h-[92vh] w-[min(92vw,720px)] max-w-full object-contain"
          />
        </div>
      )}
    </div>
    </PhoneShell>
  );
};

export default MenuItemDetails;
