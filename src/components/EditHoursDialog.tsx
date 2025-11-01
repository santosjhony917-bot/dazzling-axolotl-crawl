import React, { useState, useEffect } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { WeekSchedule, DaySchedule, TimeSlot } from '@/types/schedule';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimeSlotInputProps {
  slot: TimeSlot;
  onSlotChange: (newSlot: TimeSlot) => void;
  onRemove: () => void;
}

const TimeSlotInput: React.FC<TimeSlotInputProps> = ({ slot, onSlotChange, onRemove }) => {
  return (
    <div className="flex items-center space-x-2">
      <Input
        type="time"
        value={slot.start}
        onChange={(e) => onSlotChange({ ...slot, start: e.target.value })}
        className="w-full"
      />
      <span>-</span>
      <Input
        type="time"
        value={slot.end}
        onChange={(e) => onSlotChange({ ...slot, end: e.target.value })}
        className="w-full"
      />
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

interface DayScheduleEditorProps {
  day: keyof WeekSchedule;
  schedule: DaySchedule;
  onUpdate: (newSchedule: DaySchedule) => void;
}

const dayLabels: Record<keyof WeekSchedule, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const DayScheduleEditor: React.FC<DayScheduleEditorProps> = ({ day, schedule, onUpdate }) => {
  const handleToggleOpen = (checked: boolean) => {
    onUpdate({ 
      ...schedule, 
      isOpen: checked, 
      slots: checked && schedule.slots.length === 0 ? [{ start: '09:00', end: '18:00' }] : schedule.slots
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
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm">{dayLabels[day]}</h4>
        <Switch checked={schedule.isOpen} onCheckedChange={handleToggleOpen} className="data-[state=checked]:bg-[#E47948]" />
      </div>
      {schedule.isOpen && (
        <div className="mt-3 space-y-3">
          {schedule.slots.map((slot, index) => (
            <TimeSlotInput
              key={index}
              slot={slot}
              onSlotChange={(newSlot) => handleSlotChange(index, newSlot)}
              onRemove={() => handleRemoveSlot(index)}
            />
          ))}
          <Button variant="outline" size="sm" onClick={handleAddSlot} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Horário
          </Button>
        </div>
      )}
    </Card>
  );
};

interface EditHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSchedule: WeekSchedule;
  onSave: (newSchedule: WeekSchedule) => void;
}

export const EditHoursDialog: React.FC<EditHoursDialogProps> = ({ open, onOpenChange, currentSchedule, onSave }) => {
  const [schedule, setSchedule] = useState<WeekSchedule>(currentSchedule);

  useEffect(() => {
    setSchedule(currentSchedule);
  }, [currentSchedule]);

  const handleUpdateDay = (day: keyof WeekSchedule, newDaySchedule: DaySchedule) => {
    setSchedule(prev => ({
      ...prev,
      [day]: newDaySchedule,
    }));
  };

  const handleSave = () => {
    onSave(schedule);
    onOpenChange(false);
  };

  const daysOrder: (keyof WeekSchedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Editar Horários de Funcionamento</DialogTitle>
          <DialogDescription>
            Defina os horários de abertura e fechamento para cada dia da semana.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-4">
          <div className="grid gap-4 py-4">
            {daysOrder.map((day) => (
              <DayScheduleEditor
                key={day}
                day={day}
                schedule={schedule[day]}
                onUpdate={(newSchedule) => handleUpdateDay(day, newSchedule)}
              />
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Horários</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};