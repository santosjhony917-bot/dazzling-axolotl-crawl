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
      <DialogContent className="sm:max-w-[425px] rounded-2xl shadow-soft-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-bold">
            <DollarSign className="w-5 h-5 text-highlight" />
            Filtrar por Preço
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="minPrice" className="text-primary font-medium">Preço Mínimo ({formatPrice(minPrice)})</Label>
            <Input
              id="minPrice"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(Math.max(0, parseFloat(e.target.value) || 0))}
              min="0"
              className="h-10 rounded-xl border-gray-300 focus:border-highlight focus:ring-highlight shadow-soft-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxPrice" className="text-primary font-medium">Preço Máximo ({formatPrice(maxPrice)})</Label>
            <Input
              id="maxPrice"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Math.max(minPrice, parseFloat(e.target.value) || minPrice))}
              min={minPrice}
              className="h-10 rounded-xl border-gray-300 focus:border-highlight focus:ring-highlight shadow-soft-sm"
            />
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