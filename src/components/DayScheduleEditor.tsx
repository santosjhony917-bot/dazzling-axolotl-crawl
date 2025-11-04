"use client";

import React, { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Plus } from 'lucide-react';
import { DaySchedule, TimeSlot } from '@/types/schedule';

interface DayScheduleEditorProps {
  dayName: string;
  initialSchedule: DaySchedule;
  onScheduleChange: (daySchedule: DaySchedule) => void;
}

export function DayScheduleEditor({ dayName, initialSchedule, onScheduleChange }: DayScheduleEditorProps) {
  const [isActive, setIsActive] = useState(initialSchedule.isActive);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(initialSchedule.timeSlots);

  useEffect(() => {
    onScheduleChange({ day: dayName, isActive, timeSlots });
  }, [isActive, timeSlots, dayName, onScheduleChange]);

  const handleToggle = (checked: boolean) => {
    setIsActive(checked);
  };

  const handleTimeChange = (index: number, field: 'start' | 'end', value: string) => {
    const newTimeSlots = [...timeSlots];
    newTimeSlots[index] = { ...newTimeSlots[index], [field]: value };
    setTimeSlots(newTimeSlots);
  };

  const handleAddTimeSlot = () => {
    setTimeSlots([...timeSlots, { start: '09:00', end: '18:00' }]);
  };

  const handleRemoveTimeSlot = (index: number) => {
    const newTimeSlots = timeSlots.filter((_, i) => i !== index);
    setTimeSlots(newTimeSlots);
  };

  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <Label htmlFor={`toggle-${dayName}`} className="text-lg font-semibold">{dayName}</Label>
        <Switch
          id={`toggle-${dayName}`}
          checked={isActive}
          onCheckedChange={handleToggle}
        />
      </div>

      {isActive && (
        <div className="space-y-3">
          {timeSlots.map((slot, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="time"
                value={slot.start}
                onChange={(e) => handleTimeChange(index, 'start', e.target.value)}
                className="w-full"
              />
              <span className="mx-1">-</span>
              <Input
                type="time"
                value={slot.end}
                onChange={(e) => handleTimeChange(index, 'end', e.target.value)}
                className="w-full"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveTimeSlot(index)}
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 mt-3"
            onClick={handleAddTimeSlot}
          >
            <Plus className="h-4 w-4" /> Adicionar Horário
          </Button>
        </div>
      )}
    </div>
  );
}