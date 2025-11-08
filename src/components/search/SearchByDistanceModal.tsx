import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Compass } from 'lucide-react';

interface SearchByDistanceModalProps {
  open: boolean; // Alterado de isOpen para open
  onOpenChange: (open: boolean) => void; // Alterado de onClose para onOpenChange
  onApply: (maxDistanceKm: number) => void; // Alterado de onApplyFilter para onApply
  currentDistance: number; // Adicionado para inicializar o slider
}

const SearchByDistanceModal: React.FC<SearchByDistanceModalProps> = ({ open, onOpenChange, onApply, currentDistance }) => {
  const [maxDistance, setMaxDistance] = useState<number[]>([currentDistance]);

  useEffect(() => {
    setMaxDistance([currentDistance]);
  }, [currentDistance]);

  const handleApply = () => {
    onApply(maxDistance[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl shadow-soft-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-bold">
            <Compass className="w-5 h-5 text-highlight" />
            Filtrar por Distância
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <Label htmlFor="distance" className="text-primary font-medium">Distância Máxima: {maxDistance[0]} km</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={handleApply} variant="highlight" className="rounded-xl">Aplicar Filtro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SearchByDistanceModal;