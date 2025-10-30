import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Plus, X } from 'lucide-react';
import { Restaurant } from '@/types/supabase';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { WeekSchedule, DaySchedule, TimeSlot } from '@/types/schedule';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OpeningHoursFormProps {
  restaurant: Restaurant;
  refetch: () => void;
}

const daysOfWeek: (keyof WeekSchedule)[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const dayLabels: Record<keyof WeekSchedule, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const defaultSchedule: WeekSchedule = {
  monday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
  tuesday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
  wednesday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
  thursday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
  friday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
  saturday: { isOpen: false, slots: [] },
  sunday: { isOpen: false, slots: [] },
};

const TimeSlotInput: React.FC<{ slot: TimeSlot, onChange: (newSlot: TimeSlot) => void, onRemove: () => void }> = ({ slot, onChange, onRemove }) => (
  <div className="flex items-center gap-2">
    <Input
      type="time"
      value={slot.start}
      onChange={(e) => onChange({ ...slot, start: e.target.value })}
      className="h-9 text-sm focus:border-highlight focus:ring-highlight"
    />
    <span className="text-gray-500">-</span>
    <Input
      type="time"
      value={slot.end}
      onChange={(e) => onChange({ ...slot, end: e.target.value })}
      className="h-9 text-sm focus:border-highlight focus:ring-highlight"
    />
    <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-red-500 hover:bg-red-50">
      <X className="h-4 w-4" />
    </Button>
  </div>
);

const DayScheduleEditor: React.FC<{ day: keyof WeekSchedule, schedule: DaySchedule, onUpdate: (newSchedule: DaySchedule) => void, isSaving: boolean }> = ({ day, schedule, onUpdate, isSaving }) => {
  const handleToggleOpen = (isOpen: boolean) => {
    onUpdate({ ...schedule, isOpen, slots: isOpen && schedule.slots.length === 0 ? [{ start: '09:00', end: '18:00' }] : schedule.slots });
  };

  const handleAddSlot = () => {
    onUpdate({ ...schedule, slots: [...schedule.slots, { start: '09:00', end: '18:00' }] });
  };

  const handleSlotChange = (index: number, newSlot: TimeSlot) => {
    const newSlots = schedule.slots.map((s, i) => (i === index ? newSlot : s));
    onUpdate({ ...schedule, slots: newSlots });
  };

  const handleRemoveSlot = (index: number) => {
    const newSlots = schedule.slots.filter((_, i) => i !== index);
    onUpdate({ ...schedule, slots: newSlots });
  };

  return (
    <Card className="p-4 shadow-soft-sm rounded-xl border-gray-200">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{dayLabels[day]}</h4>
        <Switch checked={schedule.isOpen} onCheckedChange={handleToggleOpen} disabled={isSaving} className="data-[state=checked]:bg-[#E47948]" />
      </div>
      {schedule.isOpen && (
        <div className="mt-3 space-y-3">
          {schedule.slots.map((slot, index) => (
            <TimeSlotInput
              key={index}
              slot={slot}
              onChange={(newSlot) => handleSlotChange(index, newSlot)}
              onRemove={() => handleRemoveSlot(index)}
            />
          ))}
          <Button type="button" variant="outline" size="sm" onClick={handleAddSlot} disabled={isSaving} className="w-full h-8 text-xs border-primary text-primary hover:bg-primary/5">
            <Plus className="h-3 w-3 mr-1" /> Adicionar Horário
          </Button>
        </div>
      )}
    </Card>
  );
};


const OpeningHoursForm: React.FC<OpeningHoursFormProps> = ({ restaurant, refetch }) => {
  const [schedule, setSchedule] = useState<WeekSchedule>(defaultSchedule);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Inicializa com os dados do DB ou o padrão
    if (restaurant.opening_hours) {
      setSchedule(restaurant.opening_hours as unknown as WeekSchedule);
    } else {
      setSchedule(defaultSchedule);
    }
  }, [restaurant.opening_hours]);

  const handleUpdateDay = (day: keyof WeekSchedule, newSchedule: DaySchedule) => {
    setSchedule(prev => ({ ...prev, [day]: newSchedule }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant.id) return;

    setIsSaving(true);
    
    try {
      // Validação básica: garantir que slots abertos tenham horários
      for (const day of daysOfWeek) {
        const daySchedule = schedule[day];
        if (daySchedule.isOpen && daySchedule.slots.length === 0) {
          showError(`O dia ${dayLabels[day]} está marcado como aberto, mas não possui horários definidos.`);
          setIsSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from('restaurants')
        .update({ opening_hours: schedule as unknown as any }) // Cast para Jsonb
        .eq('id', restaurant.id);

      if (error) throw error;

      showSuccess("Horários de funcionamento atualizados com sucesso!");
      refetch();

    } catch (e) {
      showError((e as Error).message || "Falha ao salvar os horários.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {daysOfWeek.map(day => (
            <DayScheduleEditor
              key={day}
              day={day}
              schedule={schedule[day]}
              onUpdate={(newSchedule) => handleUpdateDay(day, newSchedule)}
              isSaving={isSaving}
            />
          ))}
        </div>
      </ScrollArea>
      
      <Button type="submit" disabled={isSaving} className="w-full bg-highlight hover:bg-highlight/90 rounded-xl">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar Horários
      </Button>
    </form>
  );
};

export default OpeningHoursForm;