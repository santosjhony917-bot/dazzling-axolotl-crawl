import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign } from 'lucide-react';
import { formatPrice } from '@/utils/formatters';
import { Slider } from '@/components/ui/slider';

interface SearchByPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (minPrice: number, maxPrice: number) => void;
}

const SearchByPriceModal: React.FC<SearchByPriceModalProps> = ({ isOpen, onClose, onApplyFilter }) => {
  const [priceRange, setPriceRange] = useState<number[]>([0, 200]);

  useEffect(() => {
    if (isOpen) {
      // Opcional: resetar para valores padrão ou manter o último estado
      // setPriceRange([0, 200]); 
    }
  }, [isOpen]);

  const handleApply = () => {
    onApplyFilter(priceRange[0], priceRange[1]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl shadow-soft-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-bold">
            <DollarSign className="w-5 h-5 text-highlight" />
            Filtrar por Preço
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <Label htmlFor="priceRange" className="text-primary font-medium">
              Faixa de Preço: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
            </Label>
            <Slider
              id="priceRange"
              min={0}
              max={200}
              step={1}
              value={priceRange}
              onValueChange={setPriceRange}
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-2">
              A busca será limitada a pratos com preço entre {formatPrice(priceRange[0])} e {formatPrice(priceRange[1])}.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancelar</Button>
          <Button onClick={handleApply} variant="highlight" className="rounded-xl">Aplicar Filtro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SearchByPriceModal;