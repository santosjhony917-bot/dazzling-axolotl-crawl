"use client";

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X } from 'lucide-react';

interface SearchByDistanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (maxDistanceKm: number) => void;
  initialDistance?: number;
}

const MIN_DISTANCE = 1;
const MAX_DISTANCE = 50;

const SearchByDistanceModal: React.FC<SearchByDistanceModalProps> = ({ 
  isOpen, 
  onClose, 
  onApplyFilter,
  initialDistance = 15,
}) => {
  const [distance, setDistance] = useState<number>(initialDistance);

  const handleSliderChange = (newRange: number[]) => {
    // O slider retorna um array, mas só precisamos do primeiro valor (distância máxima)
    setDistance(newRange[0]);
  };

  const handleApply = () => {
    onApplyFilter(distance);
    onClose();
  };

  // Função para formatar a exibição da distância
  const formatDistance = (km: number) => {
    return km >= MAX_DISTANCE ? `${MAX_DISTANCE}+ km` : `${km} km`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl h-[60vh] p-0 flex flex-col justify-between">
        
        {/* Header */}
        <SheetHeader className="p-4 border-b relative">
          <SheetTitle className="text-xl font-bold text-[#022D68] text-center">Filtro de Distância</SheetTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4 h-8 w-8 text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </SheetHeader>
        
        {/* Content */}
        <div className="p-6 flex-grow flex flex-col items-center justify-center space-y-8">
          <p className="text-gray-600 text-center">Até que distância você quer buscar?</p>
          
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Até</p>
            <p className="text-5xl font-extrabold text-[#022D68]">{formatDistance(distance)}</p>
          </div>

          {/* Slider */}
          <div className="w-full max-w-sm px-4">
            <Slider
              min={MIN_DISTANCE}
              max={MAX_DISTANCE}
              step={1}
              value={[distance]}
              onValueChange={handleSliderChange}
              // Estilização do track, range e thumb
              className="
                [&>span:first-child]:h-2 
                [&>span:first-child]:bg-gray-200 
                [&>span:first-child>span]:bg-[#E47948]
                [&>span:last-child]:h-5 
                [&>span:last-child]:w-5 
                [&>span:last-child]:bg-white 
                [&>span:last-child]:border-4 
                [&>span:last-child]:border-[#E47948] 
                [&>span:last-child]:shadow-lg
              "
            />
            <div className="flex justify-between mt-2 text-sm font-semibold text-gray-600">
              <span>{MIN_DISTANCE} km</span>
              <span>{MAX_DISTANCE}+ km</span>
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 bg-white border-t flex flex-col gap-2">
          <Button 
            className="w-full h-12 bg-[#022D68] hover:bg-[#022D68]/90 text-lg font-semibold"
            onClick={handleApply}
          >
            Buscar Restaurantes
          </Button>
          <Button 
            variant="link" 
            className="w-full text-gray-600 hover:text-[#022D68]"
            onClick={onClose}
          >
            Voltar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SearchByDistanceModal;