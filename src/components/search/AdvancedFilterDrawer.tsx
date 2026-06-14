import React, { useState, useEffect, useMemo } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Filter, X, Check } from "lucide-react";

interface CategoryDisplay {
  id: string;
  name: string;
}

interface AdvancedFilterDrawerProps {
  selectedCategoryIds: string[];
  onApplyCategories: (ids: string[]) => void;
  allCategories: CategoryDisplay[];
  
  selectedNeighborhood: string | null;
  onApplyNeighborhood: (neighborhood: string | null) => void;
  
  minPrice: number | null;
  maxPrice: number | null;
  onApplyPrice: (min: number | null, max: number | null) => void;
  
  filterMode?: 'include' | 'exclude';
}

const JAMPA_NEIGHBORHOODS = [
  'Tambaú',
  'Cabo Branco',
  'Manaíra',
  'Bessa',
  'Bancários',
  'Mangabeira',
  'Geisel',
  'Valentina',
  'Centro',
  'Torre',
  'Altiplano'
];

const normalizeName = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function AdvancedFilterDrawer({
  selectedCategoryIds,
  onApplyCategories,
  allCategories,
  selectedNeighborhood,
  onApplyNeighborhood,
  minPrice,
  maxPrice,
  onApplyPrice,
  filterMode = 'exclude',
}: AdvancedFilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSelectedNormalizedNames, setLocalSelectedNormalizedNames] = useState<string[]>([]);
  const [localNeighborhood, setLocalNeighborhood] = useState<string | null>(null);
  const [localPriceRange, setLocalPriceRange] = useState<string>('all');

  const categoryIdToNormalizedNameMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach(category => {
      map.set(category.id, normalizeName(category.name));
    });
    return map;
  }, [allCategories]);

  const uniqueDisplayCategories = useMemo(() => {
    const seen = new Set<string>();
    const display: { normalizedName: string; originalName: string }[] = [];
    allCategories.forEach(category => {
      const normalized = normalizeName(category.name);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        display.push({ normalizedName: normalized, originalName: category.name });
      }
    });
    return display;
  }, [allCategories]);

  // Sync state when drawer opens
  useEffect(() => {
    if (isOpen) {
      const initialNormalizedNames = new Set<string>();
      selectedCategoryIds.forEach(id => {
        const normalizedName = categoryIdToNormalizedNameMap.get(id);
        if (normalizedName) {
          initialNormalizedNames.add(normalizedName);
        }
      });
      setLocalSelectedNormalizedNames(Array.from(initialNormalizedNames));
      setLocalNeighborhood(selectedNeighborhood);
      
      if (minPrice === null && maxPrice === null) {
        setLocalPriceRange('all');
      } else if (maxPrice !== null && maxPrice <= 25) {
        setLocalPriceRange('cheap');
      } else if (minPrice !== null && minPrice >= 25 && maxPrice !== null && maxPrice <= 50) {
        setLocalPriceRange('medium');
      } else if (minPrice !== null && minPrice >= 50) {
        setLocalPriceRange('expensive');
      } else {
        setLocalPriceRange('all');
      }
    }
  }, [isOpen, selectedCategoryIds, selectedNeighborhood, minPrice, maxPrice, categoryIdToNormalizedNameMap]);

  const handleApplyFilter = () => {
    // 1. Categories
    const finalFilteredIds: string[] = [];
    localSelectedNormalizedNames.forEach(normalizedName => {
      allCategories.forEach(category => {
        if (normalizeName(category.name) === normalizedName) {
          finalFilteredIds.push(category.id);
        }
      });
    });
    onApplyCategories(finalFilteredIds);

    // 2. Neighborhood
    onApplyNeighborhood(localNeighborhood);

    // 3. Price
    if (localPriceRange === 'all') {
      onApplyPrice(null, null);
    } else if (localPriceRange === 'cheap') {
      onApplyPrice(null, 25);
    } else if (localPriceRange === 'medium') {
      onApplyPrice(25, 50);
    } else if (localPriceRange === 'expensive') {
      onApplyPrice(50, null);
    }

    setIsOpen(false);
  };

  const handleClearFilter = () => {
    setLocalSelectedNormalizedNames([]);
    setLocalNeighborhood(null);
    setLocalPriceRange('all');
    
    onApplyCategories([]);
    onApplyNeighborhood(null);
    onApplyPrice(null, null);
    setIsOpen(false);
  };

  const hasAnyFilterActive = selectedCategoryIds.length > 0 || selectedNeighborhood !== null || minPrice !== null || maxPrice !== null;

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          className={`h-11 w-11 p-0 rounded-full flex items-center justify-center transition-all duration-200 ${
            hasAnyFilterActive
              ? "bg-[#EF2A39] text-white shadow-[0_4px_12px_rgba(239,42,57,0.3)] hover:bg-[#EF2A39]/90"
              : "bg-white text-[#6A6A6A] border border-slate-100 hover:bg-slate-50"
          }`}
        >
          <Filter className="w-4 h-4 stroke-[2.5]" />
        </Button>
      </DrawerTrigger>
      <DrawerContent
        className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-[85vh] max-h-[600px] flex-col rounded-t-[24px] border bg-background outline-none w-full max-w-md mx-auto overflow-hidden font-['Poppins']"
      >
        <DrawerHeader className="relative border-b border-slate-100 pb-4 shrink-0">
          <DrawerTitle className="text-xl font-bold text-[#3C2F2F]">Filtros Avançados</DrawerTitle>
          <DrawerDescription className="text-xs text-gray-500 mt-1">
            Refine sua busca combinando categorias, bairros e preços.
          </DrawerDescription>
          <DrawerClose className="absolute right-4 top-4 rounded-full p-1.5 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
            <span className="sr-only">Fechar</span>
          </DrawerClose>
        </DrawerHeader>
        
        <div className="flex-grow overflow-y-auto p-5 space-y-6">
          {/* Categoria */}
          <div className="space-y-3">
            <Label className="text-sm font-bold text-[#3C2F2F] tracking-wide">
              {filterMode === 'include' ? 'Filtrar Categorias' : 'Excluir Categorias'}
            </Label>
            <ToggleGroup
              type="multiple"
              value={localSelectedNormalizedNames}
              onValueChange={setLocalSelectedNormalizedNames}
              className="flex flex-wrap gap-2 justify-start"
            >
              {uniqueDisplayCategories.map((category) => (
                <ToggleGroupItem
                  key={category.normalizedName}
                  value={category.normalizedName}
                  className={`rounded-full px-4 py-1.5 h-auto text-xs font-semibold transition-all duration-150 border ${
                    localSelectedNormalizedNames.includes(category.normalizedName)
                      ? "bg-[#EF2A39] text-white border-[#EF2A39] shadow-[0_3px_8px_rgba(239,42,57,0.25)]"
                      : "bg-[#F9FAFB] text-[#6A6A6A] border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  {category.originalName}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Bairros de João Pessoa */}
          <div className="space-y-3">
            <Label className="text-sm font-bold text-[#3C2F2F] tracking-wide">Filtrar por Bairro</Label>
            <div className="flex flex-wrap gap-2">
              {JAMPA_NEIGHBORHOODS.map((neighborhood) => {
                const isSelected = localNeighborhood === neighborhood;
                return (
                  <button
                    key={neighborhood}
                    type="button"
                    onClick={() => setLocalNeighborhood(isSelected ? null : neighborhood)}
                    className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150 border ${
                      isSelected
                        ? "bg-[#EF2A39] text-white border-[#EF2A39] shadow-[0_3px_8px_rgba(239,42,57,0.25)]"
                        : "bg-[#F9FAFB] text-[#6A6A6A] border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    {neighborhood}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Faixa de Preço */}
          <div className="space-y-3 pb-4">
            <Label className="text-sm font-bold text-[#3C2F2F] tracking-wide">Faixa de Preço</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'cheap', label: 'Até R$ 25' },
                { id: 'medium', label: 'R$25 - R$50' },
                { id: 'expensive', label: 'R$ 50+' }
              ].map((range) => {
                const isSelected = localPriceRange === range.id;
                return (
                  <button
                    key={range.id}
                    type="button"
                    onClick={() => setLocalPriceRange(range.id)}
                    className={`rounded-xl py-2 px-1 text-[11px] font-bold text-center transition-all duration-150 border ${
                      isSelected
                        ? "bg-[#EF2A39] text-white border-[#EF2A39] shadow-[0_3px_8px_rgba(239,42,57,0.25)]"
                        : "bg-[#F9FAFB] text-[#6A6A6A] border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DrawerFooter className="border-t border-slate-100 p-4 shrink-0 bg-white flex flex-row gap-3">
          <Button 
            onClick={handleClearFilter} 
            variant="outline" 
            className="flex-1 h-12 rounded-[16px] text-xs font-bold text-[#6A6A6A] shadow-none"
          >
            Limpar Filtros
          </Button>
          <Button 
            onClick={handleApplyFilter}
            className="flex-1 h-12 rounded-[16px] text-xs font-bold bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white shadow-[0_6px_16px_rgba(239,42,57,0.3)] border-none"
          >
            Aplicar Filtros
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
