import React from 'react';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface SearchByPriceModalProps {
  minPrice?: number; // Tornando opcional, pois pode não haver um valor inicial
  maxPrice?: number; // Tornando opcional
  currentMin: number;
  currentMax: number;
  onApply: (min: number, max: number) => void;
  open: boolean; // Adicionado para controlar o estado do modal
  onOpenChange: (open: boolean) => void; // Adicionado para controlar o estado do modal
}

const SearchByPriceModal: React.FC<SearchByPriceModalProps> = ({
  minPrice = 0, // Valor padrão
  maxPrice = 1000, // Valor padrão
  currentMin,
  currentMax,
  onApply,
  open,
  onOpenChange,
}) => {
  const [range, setRange] = React.useState<[number, number]>([currentMin, currentMax]);

  React.useEffect(() => {
    setRange([currentMin, currentMax]);
  }, [currentMin, currentMax]);

  const handleValueChange = (value: number[]) => {
    setRange([value[0], value[1]]);
  };

  const handleApply = () => {
    onApply(range[0], range[1]);
    onOpenChange(false); // Fechar o modal após aplicar
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filtrar por Preço</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Slider
            min={minPrice}
            max={maxPrice}
            step={1}
            value={range}
            onValueChange={handleValueChange}
          />
          <div className="flex justify-between mt-4 text-sm font-medium">
            <span>{formatCurrency(range[0])}</span>
            <span>{formatCurrency(range[1])}</span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleApply}>Aplicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SearchByPriceModal;