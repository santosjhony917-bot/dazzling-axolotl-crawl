import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Clock } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

interface OpeningHoursFormProps {
  restaurant: Restaurant;
  refetch: () => void;
}

interface HourEntry {
  day: string;
  open: string;
  close: string;
  is_closed: boolean;
}

const initialHours: HourEntry[] = [
  { day: 'Segunda', open: '09:00', close: '18:00', is_closed: false },
  { day: 'Terça', open: '09:00', close: '18:00', is_closed: false },
  { day: 'Quarta', open: '09:00', close: '18:00', is_closed: false },
  { day: 'Quinta', open: '09:00', close: '18:00', is_closed: false },
  { day: 'Sexta', open: '09:00', close: '18:00', is_closed: false },
  { day: 'Sábado', open: '10:00', close: '14:00', is_closed: true },
  { day: 'Domingo', open: '10:00', close: '14:00', is_closed: true },
];

const OpeningHoursForm: React.FC<OpeningHoursFormProps> = ({ restaurant, refetch }) => {
  const queryClient = useQueryClient();
  const [hours, setHours] = useState<HourEntry[]>(initialHours);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Verifica se opening_hours é um array antes de tentar mapear
    if (Array.isArray(restaurant.opening_hours)) {
      // Faz o cast explícito para Array<HourEntry> para resolver o erro de tipagem
      const savedHours = restaurant.opening_hours as Array<HourEntry>;
      const savedHoursMap = new Map(savedHours.map((h: HourEntry) => [h.day, h]));
      
      const mergedHours = initialHours.map(initial => {
        const saved = savedHoursMap.get(initial.day);
        // Garante que 'saved' é um objeto HourEntry antes do spread
        return saved ? { ...initial, ...saved } : initial;
      });
      setHours(mergedHours);
    }
  }, [restaurant.opening_hours]);

  const handleTimeChange = (index: number, field: 'open' | 'close', value: string) => {
    const newHours = [...hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setHours(newHours);
  };

  const handleClosedChange = (index: number, checked: boolean) => {
    const newHours = [...hours];
    newHours[index] = { ...newHours[index], is_closed: checked };
    setHours(newHours);
  };

  const handleSaveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Filter out unnecessary fields before saving (like day name if not needed, but here we keep the structure)
      const payload = hours.map(h => ({
        day: h.day,
        open: h.is_closed ? null : h.open,
        close: h.is_closed ? null : h.close,
        is_closed: h.is_closed,
      }));

      const { error } = await supabase
        .from('restaurants')
        .update({ opening_hours: payload })
        .eq('id', restaurant.id);

      if (error) throw error;

      showSuccess('Horário de funcionamento atualizado com sucesso!');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurant.id] });
    } catch (error) {
      console.error('Erro ao salvar horários:', error);
      showError('Falha ao atualizar horários. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveHours} className="space-y-6">
      {hours.map((entry, index) => (
        <div key={entry.day} className="flex items-center space-x-4">
          <div className="w-24 font-medium text-gray-700">{entry.day}</div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`closed-${entry.day}`}
              checked={entry.is_closed}
              onCheckedChange={(checked) => handleClosedChange(index, checked as boolean)}
            />
            <Label htmlFor={`closed-${entry.day}`} className="text-sm">Fechado</Label>
          </div>

          <div className="flex-1 flex space-x-2">
            <Input
              type="time"
              value={entry.open}
              onChange={(e) => handleTimeChange(index, 'open', e.target.value)}
              disabled={entry.is_closed}
              className="rounded-xl"
            />
            <span className="self-center text-gray-500">-</span>
            <Input
              type="time"
              value={entry.close}
              onChange={(e) => handleTimeChange(index, 'close', e.target.value)}
              disabled={entry.is_closed}
              className="rounded-xl"
            />
          </div>
        </div>
      ))}
      
      <Separator />

      <Button type="submit" disabled={isSaving} className="w-full bg-highlight hover:bg-highlight/90 rounded-xl">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar Horários
      </Button>
    </form>
  );
};

export default OpeningHoursForm;