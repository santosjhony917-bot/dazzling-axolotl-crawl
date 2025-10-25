import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Compass } from 'lucide-react';

interface SearchByDistanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (maxDistanceKm: number) => void;
}

const SearchByDistanceModal: React.FC<SearchByDistanceModalProps> = ({ isOpen, onClose, onApplyFilter }) => {
  const [maxDistance, setMaxDistance] = useState<number[]>([10]); // Valor padrão de 10 km

  useEffect(() => {
    if (isOpen) {
      // Resetar ou manter o último estado
    }
  }, [isOpen]);

  const handleApply = () => {
    onApplyFilter(maxDistance[0]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-highlight" />
            Filtrar por Distância
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <Label htmlFor="distance">Distância Máxima: {maxDistance[0]} km</Label>
            <Slider
              id="distance"
              min={1}
              max={50}
              step={1}
              value={maxDistance}
              onValueChange={setMaxDistance}
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-2">
              A busca será limitada a restaurantes dentro de {maxDistance[0]} km da sua localização.
            </p>
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

export default SearchByDistanceModal;