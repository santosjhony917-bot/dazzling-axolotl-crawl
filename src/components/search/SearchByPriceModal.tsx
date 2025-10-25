import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface SearchByPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (minPrice: number, maxPrice: number) => void;
}

const SearchByPriceModal: React.FC<SearchByPriceModalProps> = ({ isOpen, onClose, onApplyFilter }) => {
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(100);

  useEffect(() => {
    if (isOpen) {
      // Resetar valores ao abrir, se necessário, ou manter o último estado
    }
  }, [isOpen]);

  const handleApply = () => {
    onApplyFilter(minPrice, maxPrice);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-highlight" />
            Filtrar por Preço
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="minPrice">Preço Mínimo ({formatPrice(minPrice)})</Label>
            <Input
              id="minPrice"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(Math.max(0, parseFloat(e.target.value) || 0))}
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxPrice">Preço Máximo ({formatPrice(maxPrice)})</Label>
            <Input
              id="maxPrice"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Math.max(minPrice, parseFloat(e.target.value) || minPrice))}
              min={minPrice}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleApply}>Aplicar Filtro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SearchByPriceModal;