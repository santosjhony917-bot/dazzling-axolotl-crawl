import React, { useState } from 'react';
import { MenuCategory, MenuItem } from '@/types';
import { formatPrice } from '@/utils/formatters';
import { Utensils, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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
              let descText = item.description || '';
              let options: any[] = [];
              
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
                <div key={item.id} className="py-3 flex flex-col border-b border-gray-100 last:border-b-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-800">{item.name}</h4>
                        {options.length > 0 && (
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
                    </div>
                    <div className="text-sm font-bold text-gray-600 shrink-0">
                      {formatPrice(item.price)}
                    </div>
                  </div>

                  {options.length > 0 && isExpanded && (
                    <div className="mt-2.5 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                      {options.map((optGroup, gIdx) => (
                        <div key={gIdx} className="space-y-1.5">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{optGroup.title}</p>
                          <div className="grid grid-cols-1 gap-1 text-xs">
                            {optGroup.itens.map((opt: any, oIdx: number) => (
                              <div key={oIdx} className="flex justify-between items-center bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                                <span className="font-medium text-slate-700">{opt.name}</span>
                                {opt.price > 0 ? (
                                  <span className="text-[10px] font-bold text-[#EF2A39]">
                                    +{formatPrice(opt.price)}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
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