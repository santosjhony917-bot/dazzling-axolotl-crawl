"use client";

import React, { useState, useCallback } from 'react';
import { WeekSchedule } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface TimeSlot {
  open: string;
  close: string;
}

export interface OpeningHoursFormProps {
  schedule: WeekSchedule;
  onChange: (schedule: WeekSchedule) => void;
}

const daysOfWeek = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
] as const;

const dayLabels: Record<typeof daysOfWeek[number], string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const OpeningHoursForm: React.FC<OpeningHoursFormProps> = ({ schedule, onChange }) => {
  const updateSchedule = useCallback((day: typeof daysOfWeek[number], newSlots: TimeSlot[]) => {
    onChange({
      ...schedule,
      [day]: newSlots,
    });
  }, [schedule, onChange]);

  const handleAddSlot = (day: typeof daysOfWeek[number]) => {
    updateSchedule(day, [...(schedule[day] || []), { open: '09:00', close: '18:00' }]);
  };

  const handleRemoveSlot = (day: typeof daysOfWeek[number], index: number) => {
    const newSlots = (schedule[day] || []).filter((_, i) => i !== index);
    updateSchedule(day, newSlots);
  };

  const handleTimeChange = (day: typeof daysOfWeek[number], index: number, field: 'open' | 'close', value: string) => {
    const newSlots = (schedule[day] || []).map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    );
    updateSchedule(day, newSlots);
  };

  const handleToggleClosed = (day: typeof daysOfWeek[number], checked: boolean) => {
    if (checked) {
      // If checked (closed), set slots to empty array
      updateSchedule(day, []);
    } else {
      // If unchecked (open), set a default slot if none exists
      if (!schedule[day] || schedule[day].length === 0) {
        updateSchedule(day, [{ open: '09:00', close: '18:00' }]);
      }
    }
  };

  return (
    <div className="space-y-4">
      {daysOfWeek.map((day) => {
        const slots = schedule[day] || [];
        const isClosed = slots.length === 0;

        return (
          <Card key={day} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="font-semibold capitalize">{dayLabels[day]}</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`closed-${day}`}
                  checked={isClosed}
                  onCheckedChange={(checked) => handleToggleClosed(day, checked as boolean)}
                />
                <Label htmlFor={`closed-${day}`} className="text-sm font-normal">Fechado</Label>
              </div>
            </div>

            {!isClosed && (
              <CardContent className="p-0 space-y-3">
                {slots.map((slot, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <Label htmlFor={`${day}-open-${index}`} className="sr-only">Abertura</Label>
                      <Input
                        id={`${day}-open-${index}`}
                        type="time"
                        value={slot.open}
                        onChange={(e) => handleTimeChange(day, index, 'open', e.target.value)}
                      />
                    </div>
                    <span className="text-gray-500">-</span>
                    <div className="flex-1">
                      <Label htmlFor={`${day}-close-${index}`} className="sr-only">Fechamento</Label>
                      <Input
                        id={`${day}-close-${index}`}
                        type="time"
                        value={slot.close}
                        onChange={(e) => handleTimeChange(day, index, 'close', e.target.value)}
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveSlot(day, index)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleAddSlot(day)}
                  className="w-full mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Horário
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default OpeningHoursForm;