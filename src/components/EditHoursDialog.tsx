"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DayScheduleEditor } from './DayScheduleEditor';
import { WeekSchedule, DaySchedule } from '@/types/schedule';

interface EditHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSchedule: WeekSchedule;
  onSave: (newSchedule: WeekSchedule) => Promise<void>;
}

const daysOfWeekNames = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

export function EditHoursDialog({ open, onOpenChange, currentSchedule, onSave }: EditHoursDialogProps) {
  const [editedSchedule, setEditedSchedule] = useState<WeekSchedule>(currentSchedule);

  useEffect(() => {
    if (open) {
      const initializedSchedule: WeekSchedule = daysOfWeekNames.map(dayName => {
        const existingDay = currentSchedule.find(day => day.day === dayName);
        return existingDay || { day: dayName, isActive: false, timeSlots: [{ start: '09:00', end: '18:00' }] };
      });
      setEditedSchedule(initializedSchedule);
    }
  }, [open, currentSchedule]);

  const handleDayScheduleChange = (updatedDaySchedule: DaySchedule) => {
    setEditedSchedule(prevSchedule =>
      prevSchedule.map(day =>
        day.day === updatedDaySchedule.day ? updatedDaySchedule : day
      )
    );
  };

  const handleSaveHours = async () => {
    await onSave(editedSchedule);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-xl max-h-[90vh] flex flex-col shadow-soft-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Horários de Funcionamento</DialogTitle>
          <DialogDescription>
            Defina os horários em que seu restaurante estará aberto.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 min-h-0">
          <div className="space-y-4">
            {editedSchedule.map(day => (
              <DayScheduleEditor
                key={day.day}
                dayName={day.day}
                initialSchedule={day}
                onScheduleChange={handleDayScheduleChange}
              />
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-4">
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSaveHours}>Salvar Horários</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}