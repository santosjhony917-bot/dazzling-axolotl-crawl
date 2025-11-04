import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, X } from 'lucide-react';
import { WeekSchedule, DaySchedule, TimeSlot } from '@/types/schedule';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSchedule: WeekSchedule;
  onSave: (newSchedule: WeekSchedule) => Promise<void>;
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

const DayScheduleEditor: React.FC<{ day: keyof WeekSchedule, schedule: DaySchedule, onUpdate: (newSchedule: DaySchedule) => void }> = ({ day, schedule, onUpdate }) => {
  const handleToggleOpen = (isOpen: boolean) => {
    onUpdate({ 
      ...schedule, 
      isOpen, 
      slots: isOpen && schedule.slots.length === 0 ? [{ start: '09:00', end: '18:00' }] : schedule.slots 
    });
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
        <Switch checked={schedule.isOpen} onCheckedChange={handleToggleOpen} className="data-[state=checked]:bg-[#E47948]" />
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
          <Button type="button" variant="outline" size="sm" onClick={handleAddSlot} className="w-full h-8 text-xs border-primary text-primary hover:bg-primary/5">
            <Plus className="h-3 w-3 mr-1" /> Adicionar Horário
          </Button>
        </div>
      )}
    </Card>
  );
};

export function EditHoursDialog({ open, onOpenChange, currentSchedule, onSave }: EditHoursDialogProps) {
  const [schedule, setSchedule] = useState<WeekSchedule>(currentSchedule);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSchedule(currentSchedule);
    }
  }, [open, currentSchedule]);

  const handleUpdateDay = (day: keyof WeekSchedule, newSchedule: DaySchedule) => {
    setSchedule(prev => ({ ...prev, [day]: newSchedule }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(schedule);
      onOpenChange(false);
    } catch (e) {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-xl max-h-[90vh] flex flex-col shadow-soft-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Horários de Funcionamento</DialogTitle>
          <DialogDescription>
            Defina os horários em que seu restaurante estará aberto.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 min-h-0">
          <div className="space-y-4">
            {daysOfWeek.map(day => (
              <DayScheduleEditor
                key={day}
                day={day}
                schedule={schedule[day]}
                onUpdate={(newSchedule) => handleUpdateDay(day, newSchedule)}
              />
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading} variant="highlight">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Salvar Horários"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}