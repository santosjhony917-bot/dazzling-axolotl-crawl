"use client";

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/utils/formatters';

interface SearchByPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (minPrice: number, maxPrice: number) => void;
}

// Faixas de preço predefinidas
const PRICE_RANGES = [
  { label: 'Até R$20', min: 0, max: 20 },
  { label: 'R$20 - R$50', min: 20, max: 50 },
  { label: 'R$50 - R$100', min: 50, max: 100 },
  { label: 'Acima de R$100', min: 100, max: 500 }, // Max arbitrário alto
];

const MIN_GLOBAL_PRICE = 0;
const MAX_GLOBAL_PRICE = 500; // Limite superior para o slider

const SearchByPriceModal: React.FC<SearchByPriceModalProps> = ({ isOpen, onClose, onApplyFilter }) => {
  const [priceRange, setPriceRange] = useState<[number, number]>([20, 75]);
  const [minInput, setMinInput] = useState('20,00');
  const [maxInput, setMaxInput] = useState('75,00');
  const [selectedRange, setSelectedRange] = useState<string | null>('R$20 - R$50');

  // Sincroniza o estado do slider com os inputs
  useEffect(() => {
    setMinInput(formatCurrency(priceRange[0], false));
    setMaxInput(formatCurrency(priceRange[1], false));
    
    // Desseleciona a faixa rápida se o slider for movido manualmente
    const currentRangeLabel = PRICE_RANGES.find(
      r => r.min === priceRange[0] && r.max === priceRange[1]
    )?.label || null;
    
    setSelectedRange(currentRangeLabel);

  }, [priceRange]);

  const handleSliderChange = (newRange: number[]) => {
    setPriceRange([newRange[0], newRange[1]]);
  };

  const handleQuickRangeSelect = (range: typeof PRICE_RANGES[0]) => {
    setPriceRange([range.min, range.max]);
    setSelectedRange(range.label);
  };

  const handleInputBlur = (type: 'min' | 'max') => {
    const value = type === 'min' ? minInput : maxInput;
    const numericValue = parseFloat(value.replace(',', '.'));

    if (isNaN(numericValue)) return;

    if (type === 'min') {
      const newMin = Math.max(MIN_GLOBAL_PRICE, Math.min(numericValue, priceRange[1]));
      setPriceRange([newMin, priceRange[1]]);
    } else {
      const newMax = Math.min(MAX_GLOBAL_PRICE, Math.max(numericValue, priceRange[0]));
      setPriceRange([priceRange[0], newMax]);
    }
  };
  
  const handleApply = () => {
    onApplyFilter(priceRange[0], priceRange[1]);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl h-[80vh] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-xl font-bold text-[#022D68]">Pesquisar por Preço</SheetTitle>
        </SheetHeader>
        
        <div className="p-6 space-y-6">
          
          {/* Slider de Faixa de Preço */}
          <div className="space-y-4">
            <div className="relative pt-4 pb-8">
              <Slider
                min={MIN_GLOBAL_PRICE}
                max={MAX_GLOBAL_PRICE}
                step={1}
                value={priceRange}
                onValueChange={handleSliderChange}
                // Estilização do track e range (primeiro span e seu filho)
                // Estilização do thumb (último span)
                className="
                  [&>span:first-child]:h-2 
                  [&>span:first-child]:bg-gray-200 
                  [&>span:first-child>span]:bg-[#E47948]
                  [&>span:last-child]:h-5 
                  [&>span:last-child]:w-5 
                  [&>span:last-child]:bg-[#E47948] 
                  [&>span:last-child]:border-2 
                  [&>span:last-child]:border-white 
                  [&>span:last-child]:shadow-md
                "
              />
              <div className="flex justify-between mt-2 text-sm font-semibold text-gray-600">
                <span>{formatCurrency(priceRange[0])}</span>
                <span>{formatCurrency(priceRange[1])}</span>
              </div>
            </div>
          </div>

          {/* Inputs de Preço */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="min-price" className="text-sm font-medium text-gray-700">Preço Mínimo</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <Input
                  id="min-price"
                  value={minInput}
                  onChange={(e) => setMinInput(e.target.value)}
                  onBlur={() => handleInputBlur('min')}
                  className="pl-8 text-base"
                  type="text"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="max-price" className="text-sm font-medium text-gray-700">Preço Máximo</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <Input
                  id="max-price"
                  value={maxInput}
                  onChange={(e) => setMaxInput(e.target.value)}
                  onBlur={() => handleInputBlur('max')}
                  className="pl-8 text-base"
                  type="text"
                />
              </div>
            </div>
          </div>
          
          {/* Faixas de Preço Rápida */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Faixas de Preço</Label>
            <div className="grid grid-cols-2 gap-3">
              {PRICE_RANGES.map((range) => (
                <Button
                  key={range.label}
                  variant="outline"
                  className={`h-10 rounded-full text-sm font-semibold transition-colors ${
                    selectedRange === range.label
                      ? 'bg-[#E47948] text-white border-[#E47948] hover:bg-[#E47948]/90'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleQuickRangeSelect(range)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Botão Aplicar Filtro */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <Button 
            className="w-full h-12 bg-[#022D68] hover:bg-[#022D68]/90 text-lg font-semibold"
            onClick={handleApply}
          >
            Aplicar Filtro
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SearchByPriceModal;