import React from 'react';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils'; // Alterado de formatPrice para formatCurrency
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

interface SearchByPriceModalProps {
  minPrice: number;
  maxPrice: number;
  currentMin: number;
  currentMax: number;
  onApply: (min: number, max: number) => void;
}

const SearchByPriceModal: React.FC<SearchByPriceModalProps> = ({
  minPrice,
  maxPrice,
  currentMin,
  currentMax,
  onApply,
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
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Preço
        </Button>
      </DialogTrigger>
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
            range
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