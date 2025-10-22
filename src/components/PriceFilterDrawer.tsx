import { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceFilterDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onApply: (priceRange: [number, number]) => void;
}

const priceRanges = [
  { label: 'Até R$20', range: [0, 20] as [number, number] },
  { label: 'R$20 - R$50', range: [20, 50] as [number, number] },
  { label: 'R$50 - R$100', range: [50, 100] as [number, number] },
  { label: 'Acima de R$100', range: [100, 200] as [number, number] },
];

const PriceFilterDrawer = ({ isOpen, onOpenChange, onApply }: PriceFilterDrawerProps) => {
  const [priceRange, setPriceRange] = useState<[number, number]>([20, 75]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  useEffect(() => {
    const matchingPreset = priceRanges.find(p => p.range[0] === priceRange[0] && p.range[1] === priceRange[1]);
    if (matchingPreset) {
      setSelectedPreset(matchingPreset.label);
    } else {
      setSelectedPreset(null);
    }
  }, [priceRange]);

  const handleApply = () => {
    onApply(priceRange);
    onOpenChange(false);
  };

  const handlePresetClick = (preset: { label: string, range: [number, number] }) => {
    setPriceRange(preset.range);
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-white dark:bg-gray-800">
        <div className="mx-auto w-full max-w-md">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 h-1.5 w-12 bg-gray-300 rounded-full" />
          <DrawerHeader className="flex items-center justify-between pt-8">
            <DrawerTitle className="text-xl font-bold text-primary dark:text-white">Pesquisar por Preço</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="text-primary dark:text-white">
                <X className="h-6 w-6" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="p-4 space-y-8">
            <div className="relative pt-4">
              <Slider
                value={priceRange}
                max={200}
                step={5}
                onValueChange={(value) => setPriceRange(value as [number, number])}
              />
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2">
                <span>R${priceRange[0]}</span>
                <span>R${priceRange[1]}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Preço Mínimo</label>
                <Input
                  value={formatCurrency(priceRange[0])}
                  readOnly
                  className="mt-1 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Preço Máximo</label>
                <Input
                  value={formatCurrency(priceRange[1])}
                  readOnly
                  className="mt-1 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Faixas de Preço</p>
              <div className="grid grid-cols-2 gap-3">
                {priceRanges.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      "rounded-full h-11 border-gray-300 dark:border-gray-600 hover:bg-highlight/10",
                      selectedPreset === preset.label && "bg-highlight text-white border-highlight hover:bg-highlight/90"
                    )}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DrawerFooter className="pt-6">
            <Button onClick={handleApply} className="w-full bg-primary h-12 text-base font-bold rounded-lg">Aplicar Filtro</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default PriceFilterDrawer;