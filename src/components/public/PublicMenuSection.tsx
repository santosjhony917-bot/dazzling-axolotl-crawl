import { formatMenuPrice, getRequiredOptionRelativePricePreview } from '@/utils/menuPricing';
import React, { useState } from 'react';
import { MenuCategory, MenuItem } from '@/types';
import { Utensils, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MenuComboBadge } from './MenuComboDetails';
import {
  getComboComponents,
  getComboSimulationGroups,
  getMenuOptionGroupInstruction,
  getMenuOptionGroups,
  getMenuOptionPriceLabel,
  getOptionGroupPreviewLine,
  getPublicDescriptionText,
  isComboMenuItem,
  isConfigurableMenuItem,
} from '@/utils/menuCombos';
import { cn } from '@/lib/utils';

interface PublicMenuSectionProps {
  categories: (MenuCategory & { menu_items: MenuItem[] })[];
  restaurantId: string;
}

const PublicMenuSection: React.FC<PublicMenuSectionProps> = ({ categories, restaurantId }) => {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Filtrar categorias que tenham pelo menos um item ativo
  const activeCategories = categories.filter(category => category.menu_items && category.menu_items.length > 0);

  if (activeCategories.length === 0) {
    return (
      <div className="text-center p-6 bg-white rounded-2xl shadow-none border border-gray-100">
        <Utensils className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Nenhum item ativo no cardápio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeCategories.map(category => (
        <section key={category.id} className="space-y-3">
          {/* Título da categoria simplificado */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pb-1 border-b border-gray-200">
            {category.name}
          </h3>
          
          {/* Lista simples de itens sem imagens ou cards */}
          <div className="bg-white px-3 rounded-2xl border border-gray-100 shadow-none">
            {category.menu_items.map(item => {
              let descText = getPublicDescriptionText(item);
              const itemDisplayName = item.display_name || item.name;
              const comboComponents = getComboComponents(item);
              const isCombo = isComboMenuItem(item);
              const isConfigurable = isConfigurableMenuItem(item);
              const nativeOptions: any[] = getMenuOptionGroups(item);
              const comboOptions: any[] = getComboSimulationGroups(comboComponents);
              const options: any[] = nativeOptions.length > 0 ? nativeOptions : comboOptions;
              const hasExpandableDetails = options.length > 0;
              const optionPreviewLines = (isConfigurable || isCombo)
                ? options.map((group) => getOptionGroupPreviewLine(group)).filter(Boolean).slice(0, 2)
                : [];

              const isExpanded = !!expandedItems[item.id];

              return (
                <div key={item.id} className="py-3 flex flex-col border-b border-gray-100 last:border-b-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-800">{itemDisplayName}</h4>
                        {isCombo && <MenuComboBadge item={item} components={comboComponents} />}
                        {(isConfigurable || isCombo) && hasExpandableDetails && (
                          <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-600">
                            Opções
                          </span>
                        )}
                        {hasExpandableDetails && (
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                      {descText && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{descText}</p>
                      )}
                      {optionPreviewLines.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {optionPreviewLines.map((line, lineIndex) => (
                            <div key={`${item.id}-option-preview-${lineIndex}`} className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#df4b1c]/70" />
                              <span className="line-clamp-1">{line}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-bold text-gray-600 shrink-0">
                      {formatMenuPrice(item)}
                    </div>
                  </div>

                  {hasExpandableDetails && isExpanded && (
                    <div className="mt-2.5 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                      {options.map((optGroup, gIdx) => (
                        <div key={gIdx} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{optGroup.title || optGroup.name}</p>
                            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase text-slate-400">
                              {getMenuOptionGroupInstruction(optGroup)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-1 text-xs">
                            {(optGroup.items || optGroup.itens || []).map((opt: any, oIdx: number) => {
                              const priceLabel = getRequiredOptionRelativePricePreview(item, optGroup, opt) || getMenuOptionPriceLabel(opt, optGroup);
                              return (
                                <div key={oIdx} className="flex justify-between items-start gap-3 bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                                  <div className="min-w-0">
                                    <span className="font-medium text-slate-700">{opt.name}</span>
                                  </div>
                                  <span className={cn(
                                    "shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                                    priceLabel.tone === 'included'
                                      ? "text-emerald-600 bg-emerald-50"
                                      : priceLabel.tone === 'absolute'
                                        ? "text-slate-700 bg-slate-100"
                                        : "text-[#df4b1c]"
                                  )}>
                                    {priceLabel.label}
                                  </span>
                                </div>
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
        </section>
      ))}
      
      {/* Botão de navegação simplificado como link sublinhado */}
      <div className="mt-4 text-center">
        <Button 
          variant="link" 
          onClick={() => navigate(`/restaurant/${restaurantId}/menu`)}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium underline p-0 h-auto"
        >
          Ver Cardápio Completo
        </Button>
      </div>
    </div>
  );
};

export default PublicMenuSection;
